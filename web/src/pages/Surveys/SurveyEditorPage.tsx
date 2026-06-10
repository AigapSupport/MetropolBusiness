/**
 * PANELS_SPEC §A.6 (sadeleştirilmiş) — anket oluştur/düzenle sayfası:
 * başlık + tek-seferlik toggle + soru editörü (4 tip, yukarı/aşağı sıralama).
 * "Taslak Kaydet" / "Yayımla" status alanını belirler (POST/PUT /admin/company/surveys).
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { SurveyQuestionType } from '@shared/home';
import type { ContentStatus, SurveyUpsertRequest } from '@shared/content-admin';
import { adminApi } from '../../api/adminApi';
import PageHeader from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import {
  CheckboxField,
  FormField,
  inputStyle,
  linkButtonStyle,
  dangerLinkButtonStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  selectStyle,
} from '../../components/ui/fields';
import { colors, radii } from '../../theme/tokens';
import { apiErrorMessage } from '../../utils/apiErrorMessage';

const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  single: 'Tekli seçim',
  multi: 'Çoklu seçim',
  text: 'Açık metin',
  rating: 'Derecelendirme (1-5)',
};

/** Editör içi soru durumu — options metin alanında satır satır tutulur. */
interface QuestionDraft {
  localId: number;
  type: SurveyQuestionType;
  text: string;
  optionsText: string;
}

let nextLocalId = 1;

function newQuestion(): QuestionDraft {
  nextLocalId += 1;
  return { localId: nextLocalId, type: 'single', text: '', optionsText: '' };
}

function needsOptions(type: SurveyQuestionType): boolean {
  return type === 'single' || type === 'multi';
}

export default function SurveyEditorPage() {
  const { surveyId } = useParams<{ surveyId: string }>();
  const isNew = surveyId === undefined;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const detailQuery = useQuery({
    queryKey: ['admin-survey', surveyId],
    queryFn: () => adminApi.getSurvey(surveyId ?? ''),
    enabled: !isNew,
  });

  const [title, setTitle] = useState('');
  const [singleResponse, setSingleResponse] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([newQuestion()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [loadedFromServer, setLoadedFromServer] = useState(false);

  // Mevcut anket düzenlemesinde formu sunucu verisiyle bir kez doldur.
  useEffect(() => {
    if (isNew || loadedFromServer || detailQuery.data === undefined) {
      return;
    }
    const detail = detailQuery.data;
    setTitle(detail.title);
    setSingleResponse(detail.singleResponse);
    setQuestions(
      [...detail.questions]
        .sort((a, b) => a.order - b.order)
        .map((question) => {
          nextLocalId += 1;
          return {
            localId: nextLocalId,
            type: question.type,
            text: question.text,
            optionsText: (question.options ?? []).join('\n'),
          };
        }),
    );
    setLoadedFromServer(true);
  }, [isNew, loadedFromServer, detailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (request: SurveyUpsertRequest) =>
      isNew
        ? adminApi.createSurvey(request)
        : adminApi.updateSurvey(surveyId ?? '', request),
    onSuccess: (_detail, request) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-surveys'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-survey', surveyId] });
      showToast(
        'success',
        request.status === 'published' ? 'Anket yayımlandı.' : 'Anket taslak olarak kaydedildi.',
      );
      navigate('/content/surveys');
    },
    onError: (error) => setFormError(apiErrorMessage(error)),
  });

  const buildRequest = (status: ContentStatus): SurveyUpsertRequest | null => {
    if (title.trim() === '') {
      setFormError('Anket başlığı zorunludur.');
      return null;
    }
    if (questions.length === 0) {
      setFormError('En az bir soru ekleyin.');
      return null;
    }
    for (const [index, question] of questions.entries()) {
      if (question.text.trim() === '') {
        setFormError(`${index + 1}. sorunun metni boş olamaz.`);
        return null;
      }
      if (needsOptions(question.type)) {
        const options = parseOptions(question.optionsText);
        if (options.length < 2) {
          setFormError(`${index + 1}. soru için en az 2 seçenek girin (her satıra bir seçenek).`);
          return null;
        }
      }
    }
    return {
      title: title.trim(),
      singleResponse,
      status,
      questions: questions.map((question, index) => ({
        order: index + 1,
        type: question.type,
        text: question.text.trim(),
        options: needsOptions(question.type) ? parseOptions(question.optionsText) : null,
      })),
    };
  };

  const handleSave = (status: ContentStatus) => {
    setFormError(null);
    const request = buildRequest(status);
    if (request !== null) {
      saveMutation.mutate(request);
    }
  };

  const updateQuestion = (localId: number, patch: Partial<QuestionDraft>) => {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === localId ? { ...question, ...patch } : question,
      ),
    );
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    setQuestions((current) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  };

  const removeQuestion = (localId: number) => {
    setQuestions((current) => current.filter((question) => question.localId !== localId));
  };

  if (!isNew && detailQuery.isPending) {
    return <p style={{ fontSize: 14, color: colors.textSecondary }}>Anket yükleniyor…</p>;
  }

  if (!isNew && detailQuery.isError) {
    return (
      <div>
        <p style={{ fontSize: 14, color: colors.danger }}>
          {apiErrorMessage(detailQuery.error)}
        </p>
        <Link to="/content/surveys" style={{ color: colors.primary, fontSize: 14 }}>
          ← Anket listesine dön
        </Link>
      </div>
    );
  }

  return (
    <section>
      <PageHeader
        title={isNew ? 'Anket Oluştur' : 'Anket Düzenle'}
        description="Soruları ekleyin, sıralayın; taslak kaydedin veya yayımlayın."
        action={
          <Link to="/content/surveys" style={{ color: colors.primary, fontSize: 14 }}>
            ← Listeye dön
          </Link>
        }
      />

      <div
        style={{
          padding: 20,
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          maxWidth: 720,
        }}
      >
        <FormField label="Başlık" htmlFor="survey-title" required>
          <input
            id="survey-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Örn. Çalışan Memnuniyeti 2026"
            style={inputStyle}
          />
        </FormField>

        <CheckboxField
          label="Tek seferlik (kullanıcı yalnızca bir kez yanıtlayabilir)"
          checked={singleResponse}
          onChange={setSingleResponse}
        />

        <h2 style={{ margin: '20px 0 12px', fontSize: 16, color: colors.textPrimary }}>
          Sorular
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((question, index) => (
            <div
              key={question.localId}
              style={{
                padding: 16,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.md,
                backgroundColor: colors.contentBg,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 10,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: colors.textSecondary }}>
                  Soru {index + 1}
                </span>
                <span style={{ display: 'inline-flex', gap: 4 }}>
                  <button
                    type="button"
                    style={linkButtonStyle}
                    disabled={index === 0}
                    onClick={() => moveQuestion(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    style={linkButtonStyle}
                    disabled={index === questions.length - 1}
                    onClick={() => moveQuestion(index, 1)}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    style={dangerLinkButtonStyle}
                    onClick={() => removeQuestion(question.localId)}
                  >
                    Kaldır
                  </button>
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <select
                  value={question.type}
                  aria-label="Soru tipi"
                  onChange={(event) =>
                    updateQuestion(question.localId, {
                      type: event.target.value as SurveyQuestionType,
                    })
                  }
                  style={{ ...selectStyle, width: 220 }}
                >
                  {(Object.keys(QUESTION_TYPE_LABELS) as SurveyQuestionType[]).map((type) => (
                    <option key={type} value={type}>
                      {QUESTION_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={question.text}
                  aria-label="Soru metni"
                  onChange={(event) =>
                    updateQuestion(question.localId, { text: event.target.value })
                  }
                  placeholder="Soru metni"
                  style={{ ...inputStyle, flex: 1 }}
                />
              </div>

              {needsOptions(question.type) && (
                <textarea
                  value={question.optionsText}
                  aria-label="Seçenekler"
                  onChange={(event) =>
                    updateQuestion(question.localId, { optionsText: event.target.value })
                  }
                  placeholder={'Her satıra bir seçenek\nÖrn:\nEvet\nHayır'}
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          style={{ ...secondaryButtonStyle, marginTop: 12 }}
          onClick={() => setQuestions((current) => [...current, newQuestion()])}
        >
          + Soru Ekle
        </button>

        {formError !== null && (
          <p style={{ margin: '16px 0 0', fontSize: 13, color: colors.danger }}>{formError}</p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            disabled={saveMutation.isPending}
            onClick={() => handleSave('draft')}
          >
            Taslak Olarak Kaydet
          </button>
          <button
            type="button"
            style={primaryButtonStyle}
            disabled={saveMutation.isPending}
            onClick={() => handleSave('published')}
          >
            {saveMutation.isPending ? 'Kaydediliyor…' : 'Yayımla'}
          </button>
        </div>
      </div>
    </section>
  );
}

function parseOptions(optionsText: string): string[] {
  return optionsText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}
