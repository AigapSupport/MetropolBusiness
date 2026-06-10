// data.jsx — seed content for the prototype (Turkish).
(function () {
  const card = (id, holder, number, resto, market, gift) => ({ id, holder, number, w: { resto, market, gift } });

  const SEED = {
    profile: {
      name: 'Elif Yıldırım', first: 'Elif', last: 'Yıldırım',
      phone: '0532 418 09 76', email: 'elif.yildirim@firma.com', tc: '123******56',
      city: 'İstanbul', title: 'Kıdemli Ürün Yöneticisi', company: 'Nova Holding',
      avatar: '#7C5CBF', role: 'manager',
    },
    company: { name: 'Nova Holding', code: 'NOVA' },
    cards: [
      card('c1', 'ELİF YILDIRIM', '6375780115092976', 1840.50, 620.00, 250.00),
      card('c2', 'ELİF YILDIRIM', '6375780122847310', 410.75, 0, 1000.00),
    ],
    tx: [
      { id: 't1', cardId: 'c1', type: 'RESTOPAY', kind: 'SATIŞ', wallet: 'RESTORAN', name: 'Köfteci Yusuf', amount: -148.00, date: '09.06.2026', time: '13:24', approvalNo: '004821', merchant: 'Köfteci Yusuf Levent' },
      { id: 't2', cardId: 'c1', type: 'GIFTPAY', kind: 'SATIŞ', wallet: 'MARKET', name: 'Migros 5M', amount: -312.40, date: '08.06.2026', time: '19:02', approvalNo: '004790', merchant: 'Migros 5M Etiler' },
      { id: 't3', cardId: 'c1', type: 'RESTOPAY', kind: 'TRANSFER', wallet: 'RESTORAN', name: 'B*** K***', amount: +500.00, date: '08.06.2026', time: '09:15', approvalNo: '004771', merchant: 'Kartlar arası transfer' },
      { id: 't4', cardId: 'c1', type: 'RESTOPAY', kind: 'SATIŞ', wallet: 'RESTORAN', name: 'Starbucks', amount: -92.00, date: '07.06.2026', time: '16:40', approvalNo: '004702', merchant: 'Starbucks Kanyon' },
      { id: 't5', cardId: 'c1', type: 'GIFTPAY', kind: 'SATIŞ', wallet: 'MARKET', name: 'CarrefourSA', amount: -204.85, date: '06.06.2026', time: '11:08', approvalNo: '004688', merchant: 'CarrefourSA Maslak' },
      { id: 't6', cardId: 'c1', type: 'RESTOPAY', kind: 'YÜKLEME', wallet: 'RESTORAN', name: 'Aylık Yükleme', amount: +2200.00, date: '01.06.2026', time: '00:01', approvalNo: '004500', merchant: 'Nova Holding' },
      { id: 't7', cardId: 'c2', type: 'GIFTPAY', kind: 'SATIŞ', wallet: 'GIFT', name: 'Boyner', amount: -350.00, date: '05.06.2026', time: '15:30', approvalNo: '004610', merchant: 'Boyner Akmerkez' },
    ],
    announcements: [
      { id: 'a1', title: 'Yaz Dönemi Esnek Çalışma Başlıyor', body: 'Haziran–Eylül arası Cuma günleri 14:00 sonrası uzaktan çalışabilirsiniz.', tag: 'İK', accent: '#7C5CBF' },
      { id: 'a2', title: 'Yeni Ofis Açılışı: İzmir', body: 'Ege bölgesi ekibimiz 15 Haziran’da yeni ofiste.', tag: 'Duyuru', accent: '#3D8BD4' },
      { id: 'a3', title: 'Sağlık Sigortası Yenilendi', body: 'Tamamlayıcı sağlık paketinde kapsam genişledi.', tag: 'Yan Hak', accent: '#5FA37F' },
    ],
    surveys: [
      { id: 's1', title: 'Çalışan Memnuniyeti 2026', q: 12, done: false, tag: 'Zorunlu' },
      { id: 's2', title: 'Ofis Yemekhane Tercihleri', q: 6, done: false },
      { id: 's3', title: 'Uzaktan Çalışma Anketi', q: 8, done: true },
    ],
    surveyQuestions: [
      { id: 'q1', text: 'Genel olarak işinizden ne kadar memnunsunuz?', type: 'scale' },
      { id: 'q2', text: 'Yöneticinizden aldığınız geri bildirimi nasıl değerlendirirsiniz?', type: 'scale' },
      { id: 'q3', text: 'Aşağıdakilerden hangisi sizin için en önemli?', type: 'choice', options: ['Esnek çalışma', 'Kariyer gelişimi', 'Ücret & yan haklar', 'Ekip kültürü'] },
      { id: 'q4', text: 'Şirketi bir arkadaşınıza tavsiye eder misiniz?', type: 'scale' },
    ],
    videos: [
      { id: 'v1', title: 'Bilgi Güvenliği Eğitimi 2026', dur: '08:24', watched: false, tag: 'Zorunlu' },
      { id: 'v2', title: 'Yeni Performans Sistemi Tanıtımı', dur: '12:10', watched: false },
      { id: 'v3', title: 'Etik Kurallar & Uyum', dur: '05:46', watched: true },
      { id: 'v4', title: 'Liderlik Serisi: Geri Bildirim', dur: '15:32', watched: true },
    ],
    benefitTiles: [
      { id: 'b1', title: 'Kampanyalar', icon: 'percent', accent: '#F2697B' },
      { id: 'b2', title: 'Sosyal Sorumluluk', icon: 'heart', accent: '#5FA37F' },
      { id: 'b3', title: 'Kuponlar', icon: 'ticket', accent: '#3D8BD4' },
      { id: 'b4', title: 'Önerdikçe Kazan', icon: 'users', accent: '#7C5CBF' },
      { id: 'b5', title: 'Taraftar Kart', icon: 'shield', accent: '#E0883B' },
      { id: 'b6', title: 'Hediye Çekleri', icon: 'gift', accent: '#F2697B' },
    ],
    campaigns: [
      { id: 'k1', brand: 'Mavi', accent: '#3D8BD4', title: 'Tüm jeanlerde %25 indirim', desc: 'Metropol Kart ile Mavi mağazalarında ve online’da geçerli sezon ürünlerinde %25 indirim fırsatını kaçırmayın.', cat: 'Giyim' },
      { id: 'k2', brand: 'D&R', accent: '#E0883B', title: '2 al 1 öde — kitap & hobi', desc: 'Seçili yayınlarda ikinci ürün bizden. Kampanya stoklarla sınırlıdır.', cat: 'Kültür' },
      { id: 'k3', brand: 'Watsons', accent: '#5FA37F', title: 'Kişisel bakımda 200₺ üzeri %15', desc: 'Metropol Kart ile ödemelerde anında indirim.', cat: 'Kozmetik' },
      { id: 'k4', brand: 'Decathlon', accent: '#2A6FDB', title: 'Spor ekipmanlarında özel fiyatlar', desc: 'Çalışanlara özel kurumsal anlaşma fiyatları.', cat: 'Spor' },
    ],
    giftCards: [
      { id: 'g1', brand: 'Amazon', amount: 250, exp: '31.12.2026', accent: '#E0883B' },
      { id: 'g2', brand: 'Yemeksepeti', amount: 150, exp: '30.09.2026', accent: '#F2697B' },
      { id: 'g3', brand: 'Spotify', amount: 99, exp: '15.08.2026', accent: '#5FA37F' },
    ],
    stores: [
      { id: 'm1', name: 'Köfteci Yusuf', cat: 'resto', phone: '0212 280 11 22', addr: 'Levent Mah. Büyükdere Cad. No:12, Şişli', dist: '120 m', x: 38, y: 42 },
      { id: 'm2', name: 'Migros 5M', cat: 'market', phone: '0212 351 44 00', addr: 'Etiler Mah. Nispetiye Cad. No:88, Beşiktaş', dist: '450 m', x: 64, y: 30 },
      { id: 'm3', name: 'Starbucks Kanyon', cat: 'resto', phone: '0212 353 09 80', addr: 'Kanyon AVM, Levent', dist: '600 m', x: 52, y: 60 },
      { id: 'm4', name: 'Boyner Akmerkez', cat: 'gift', phone: '0212 282 01 70', addr: 'Akmerkez AVM, Etiler', dist: '900 m', x: 28, y: 66 },
      { id: 'm5', name: 'CarrefourSA', cat: 'market', phone: '0212 290 33 11', addr: 'Maslak Mah. Eski Büyükdere Cad., Sarıyer', dist: '1.4 km', x: 74, y: 54 },
    ],
    chats: [
      { id: 'ch1', name: 'Metropol Asistan', kind: 'ai', avatar: '#7C5CBF', last: 'Bakiye transferini senin için hazırladım ✨', time: '14:32', unread: 1, online: true,
        messages: [
          { from: 'them', text: 'Merhaba Elif 👋 Bugün sana nasıl yardımcı olabilirim?', time: '14:30' },
          { from: 'me', text: 'Restoran bakiyemi diğer kartıma aktarabilir misin?', time: '14:31' },
          { from: 'them', text: 'Tabii! 500₺’yi 1. karttan 2. karta aktarmaya hazırladım. Onaylıyor musun?', time: '14:32' },
        ] },
      { id: 'ch2', name: 'İK Departmanı', kind: 'user', avatar: '#3D8BD4', last: 'İzin talebiniz onaylandı ✅', time: '11:05', unread: 0, online: true,
        messages: [
          { from: 'them', text: 'Merhaba, 12–14 Haziran izin talebiniz onaylanmıştır.', time: '11:05' },
        ] },
      { id: 'ch3', name: 'Can Demir', kind: 'user', avatar: '#5FA37F', last: 'Toplantıyı 15:00’e alalım mı?', time: 'Dün', unread: 2, online: false,
        messages: [
          { from: 'them', text: 'Selam, sunum hazır mı?', time: 'Dün 16:40' },
          { from: 'them', text: 'Toplantıyı 15:00’e alalım mı?', time: 'Dün 16:41' },
        ] },
      { id: 'ch4', name: 'Gider Botu', kind: 'ai', avatar: '#E0883B', last: 'Masraf fişini yükleyebilirsin.', time: 'Pzt', unread: 0, online: true,
        messages: [{ from: 'them', text: 'Yeni masraf talebi için fişini yükleyebilirsin.', time: 'Pzt 10:00' }] },
    ],
    colleagues: [
      { id: 'u1', name: 'Can Demir', title: 'Yazılım Müdürü', avatar: '#5FA37F' },
      { id: 'u2', name: 'Zeynep Arslan', title: 'Pazarlama Uzmanı', avatar: '#F2697B' },
      { id: 'u3', name: 'Murat Kaya', title: 'Finans Direktörü', avatar: '#3D8BD4' },
      { id: 'u4', name: 'Ayşe Şahin', title: 'İK Uzmanı', avatar: '#7C5CBF' },
    ],
    leaveRequests: [
      { id: 'l1', type: 'Yıllık İzin', start: '12.06.2026', end: '14.06.2026', days: 3, status: 'Onaylandı' },
      { id: 'l2', type: 'Mazeret İzni', start: '20.06.2026', end: '20.06.2026', days: 1, status: 'Beklemede' },
    ],
    expenseRequests: [
      { id: 'e1', type: 'Ulaşım', amount: 480.00, date: '07.06.2026', status: 'Onaylandı' },
      { id: 'e2', type: 'Yemek', amount: 1250.00, date: '05.06.2026', status: 'Beklemede' },
      { id: 'e3', type: 'Konaklama', amount: 3200.00, date: '02.06.2026', status: 'Reddedildi' },
    ],
    approvals: [
      { id: 'ap1', who: 'Can Demir', type: 'Ulaşım', amount: 620.00, date: '08.06.2026' },
      { id: 'ap2', who: 'Zeynep Arslan', type: 'Yemek', amount: 940.00, date: '07.06.2026' },
      { id: 'ap3', who: 'Murat Kaya', type: 'Konaklama', amount: 2800.00, date: '06.06.2026' },
    ],
    notifications: [
      { id: 'n1', icon: 'wallet', accent: '#5FA37F', title: 'Bakiye yüklendi', body: 'Restoran cüzdanınıza 2.200₺ yüklendi.', time: '2s' },
      { id: 'n2', icon: 'percent', accent: '#F2697B', title: 'Yeni kampanya', body: 'Mavi’de %25 indirim sizi bekliyor.', time: '5s' },
      { id: 'n3', icon: 'check', accent: '#3D8BD4', title: 'İzin onayı', body: '12–14 Haziran izniniz onaylandı.', time: '1g' },
    ],
  };

  window.SEED = SEED;
})();
