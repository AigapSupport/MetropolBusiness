/**
 * PANELS_SPEC §A.6 sonuçlar (sadeleştirilmiş) — soru bazında yanıt sayım tablosu
 * + basit yüzde bar div'leri (grafik kütüphanesi yok). Açık metin (text) sorular
 * bar yerine yanıt listesi olarak gösterilir; "CSV İndir" mevcut veriden
 * istemci tarafında üretilir. GET /admin/company/surveys/{id}/results.
 */

import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { SurveyQuestionType } from '@shared/home';
import type { SurveyResultsDto } from '@shared/content-admin';
import { adminApi } from '../../api/adminApi';
import PageHeader from '../../components/ui/PageHeader';
import { secondaryButtonStyle } from '../../components/ui/fields';
import { colors, radii } from '../../theme/tokens';
import { apiErrorMessage } from '../../utils/apiErrorMessage';
import { downloadCsv } from '../../utils/csv';

const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  single: 'Tekli seçim',
  multi: 'Çoklu seçim',
  text: 'Açık metin',
  rating: 'Derecelendirme (1-5)',
};

/** Sonuçları satır bazında CSV'ye döker: soru no/metin/tip + yanıt değeri + sayı. */
function downloadResultsCsv(results: SurveyResultsDto): void {
  const rows: string[][] = [['Soru No', 'Soru', 'Soru Tipi', 'Yanıt', 'Sayı']];
  for (const question of results.questions) {
    const entries = Object.entries(question.distribution).sort((a, b) => b[1] - a[1]);
    for (const [value, count] of entries) {
      rows.push([
        String(question.order),
        question.text,
        QUESTION_TYPE_LABELS[question.type],
        value,
        String(count),
      ]);
    }
  }
  downloadCsv(`anket-sonuclari-${results.surveyId}.csv`, rows);
}

export default function SurveyResultsPage() {
  const { surveyId } = useParams<{ surveyId: string }>();

  const resultsQuery = useQuery({
    queryKey: ['admin-survey-results', surveyId],
    queryFn: () => adminApi.getSurveyResults(surveyId ?? ''),
    enabled: surveyId !== undefined,
  });

  if (resultsQuery.isPending) {
    return <p style={{ fontSize: 14, color: colors.textSecondary }}>Sonuçlar yükleniyor…</p>;
  }

  if (resultsQuery.isError || resultsQuery.data === undefined) {
    return (
      <div>
        <p style={{ fontSize: 14, color: colors.danger }}>
          {apiErrorMessage(resultsQuery.error)}
        </p>
        <Link to="/content/surveys" style={{ color: colors.primary, fontSize: 14 }}>
          ← Anket listesine dön
        </Link>
      </div>
    );
  }

  const results = resultsQuery.data;

  return (
    <section>
      <PageHeader
        title={`Sonuçlar: ${results.title}`}
        description={`Toplam katılım: ${results.responseCount}`}
        action={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => downloadResultsCsv(results)}
            >
              CSV İndir
            </button>
            <Link to="/content/surveys" style={{ color: colors.primary, fontSize: 14 }}>
              ← Listeye dön
            </Link>
          </span>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720 }}>
        {results.questions.map((question) => {
          const entries = Object.entries(question.distribution).sort((a, b) => b[1] - a[1]);
          const maxCount = entries.reduce((max, [, count]) => Math.max(max, count), 0);
          return (
            <div
              key={question.questionId}
              style={{
                padding: 20,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radii.lg,
              }}
            >
              <h2 style={{ margin: '0 0 4px', fontSize: 15, color: colors.textPrimary }}>
                {question.order}. {question.text}
              </h2>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: colors.textSecondary }}>
                {question.answerCount} yanıt
              </p>

              {entries.length === 0 ? (
                <p style={{ margin: 0, fontSize: 13, color: colors.textSecondary }}>
                  Henüz yanıt yok.
                </p>
              ) : question.type === 'text' ? (
                /* Açık metin: dağılım bar'ı yerine yanıt listesi (PANELS_SPEC §A.6). */
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {entries.map(([value, count]) => (
                    <li
                      key={value}
                      style={{
                        padding: '8px 10px',
                        fontSize: 13,
                        color: colors.textPrimary,
                        backgroundColor: colors.contentBg,
                        borderRadius: radii.md,
                        marginBottom: 6,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {value}
                      {count > 1 && (
                        <span style={{ color: colors.textSecondary }}> ({count} kez)</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {entries.map(([value, count]) => {
                    const ratio = maxCount === 0 ? 0 : count / maxCount;
                    return (
                      <div key={value}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontSize: 13,
                            color: colors.textPrimary,
                            marginBottom: 2,
                          }}
                        >
                          <span style={{ overflowWrap: 'anywhere' }}>{value}</span>
                          <span style={{ color: colors.textSecondary }}>{count}</span>
                        </div>
                        {/* Basit bar — genişlik en çok seçilen değere oranlı. */}
                        <div
                          style={{
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: colors.contentBg,
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.round(ratio * 100)}%`,
                              height: '100%',
                              backgroundColor: colors.primary,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
