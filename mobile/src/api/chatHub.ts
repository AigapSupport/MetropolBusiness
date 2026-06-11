/**
 * SignalR sohbet bağlantısı (API_CONTRACT §10, ARCHITECTURE §7).
 * - Token query'de taşınır (WebSocket'te Authorization header yok — backend yalnız
 *   /hubs yolunda kabul eder).
 * - OFFLINE KUYRUK (PRD §9.3): bağlantı yokken gönderilen mesajlar bellekte sıraya
 *   alınır; yeniden bağlanınca sırayla gönderilir. Kuyruk yalnızca oturum boyunca
 *   yaşar (kalıcı saklama Faz sonrası — mesaj zaten sunucuda kalıcıdır).
 */
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';

import type { ChatMessage } from '@shared/chat';
import { tokenStorage } from '@/store/tokenStorage';
import { config } from '@/utils/config';

export interface ChatHubEvents {
  onReceiveMessage: (conversationId: string, message: ChatMessage) => void;
  onAssistantTyping: (conversationId: string) => void;
  onTyping?: (conversationId: string, userId: string | null) => void;
  onRead?: (conversationId: string, userId: string | null, messageId: string) => void;
  onError?: (code: string, message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface QueuedMessage {
  conversationId: string;
  content: string;
}

class ChatHubClient {
  private connection: HubConnection | null = null;
  private events: ChatHubEvents | null = null;
  private readonly outbox: QueuedMessage[] = [];
  private readonly joined = new Set<string>();

  async connect(events: ChatHubEvents): Promise<void> {
    this.events = events;
    if (this.connection !== null) {
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(config.signalRHubUrl, {
        // Token her (yeniden) bağlanışta taze okunur — sessiz yenileme sonrası eskimez.
        accessTokenFactory: async () => (await tokenStorage.load())?.accessToken ?? '',
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None) // PII/token sızıntısına karşı istemci logu kapalı
      .build();

    connection.on('ReceiveMessage', (conversationId: string, message: ChatMessage) => {
      this.events?.onReceiveMessage(conversationId, message);
    });
    connection.on('AssistantTyping', (conversationId: string) => {
      this.events?.onAssistantTyping(conversationId);
    });
    connection.on('Typing', (conversationId: string, userId: string | null) => {
      this.events?.onTyping?.(conversationId, userId);
    });
    connection.on('Read', (conversationId: string, userId: string | null, messageId: string) => {
      this.events?.onRead?.(conversationId, userId, messageId);
    });
    connection.on('Error', (code: string, message: string) => {
      this.events?.onError?.(code, message);
    });

    connection.onreconnected(() => {
      this.events?.onConnectionChange?.(true);
      void this.afterConnect();
    });
    connection.onreconnecting(() => this.events?.onConnectionChange?.(false));
    connection.onclose(() => this.events?.onConnectionChange?.(false));

    this.connection = connection;
    try {
      await connection.start();
      this.events?.onConnectionChange?.(true);
      await this.afterConnect();
    } catch {
      // Başlangıç bağlantısı kurulamadı: kuyruk bekler, otomatik yeniden deneme
      // bir sonraki sendMessage çağrısında tetiklenir.
      this.events?.onConnectionChange?.(false);
    }
  }

  async disconnect(): Promise<void> {
    const connection = this.connection;
    this.connection = null;
    this.joined.clear();
    if (connection !== null) {
      await connection.stop();
    }
  }

  async joinConversation(conversationId: string): Promise<void> {
    this.joined.add(conversationId);
    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('JoinConversation', conversationId);
    }
  }

  /** Bağlıysa anında gönderir; değilse kuyruğa alır ve bağlanmayı dener. */
  async sendMessage(conversationId: string, content: string): Promise<'sent' | 'queued'> {
    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('SendMessage', conversationId, content);
      return 'sent';
    }

    this.outbox.push({ conversationId, content });
    if (this.connection !== null && this.connection.state === HubConnectionState.Disconnected) {
      try {
        await this.connection.start();
        this.events?.onConnectionChange?.(true);
        await this.afterConnect();
      } catch {
        // Hâlâ çevrimdışı — kuyruğda kalır.
      }
    }
    return 'queued';
  }

  async markRead(conversationId: string, messageId: string): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected) {
      await this.connection.invoke('MarkRead', conversationId, messageId);
    }
  }

  sendTyping(conversationId: string): void {
    if (this.connection?.state === HubConnectionState.Connected) {
      void this.connection.invoke('Typing', conversationId);
    }
  }

  /** Bağlantı sonrası: gruplara yeniden katıl + offline kuyruğu boşalt. */
  private async afterConnect(): Promise<void> {
    for (const conversationId of this.joined) {
      try {
        await this.connection?.invoke('JoinConversation', conversationId);
      } catch {
        // Katılım başarısızsa mesaj yayını alınamaz; sonraki join denemesi ekran açılışında.
      }
    }

    while (this.outbox.length > 0 && this.connection?.state === HubConnectionState.Connected) {
      const next = this.outbox[0];
      try {
        await this.connection.invoke('SendMessage', next.conversationId, next.content);
        this.outbox.shift();
      } catch {
        break; // bağlantı yine koptu — kalanlar kuyrukta
      }
    }
  }
}

/** Uygulama genelinde tek bağlantı (Chat sekmesi yaşam döngüsü yönetir). */
export const chatHub = new ChatHubClient();
