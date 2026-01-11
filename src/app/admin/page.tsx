'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui';
import { Loader2, ExternalLink, Calendar, Award, Layers, Trash2 } from 'lucide-react';

interface AnalysisRow {
  id: string;
  created_at: string;
  test_level: string;
  logo_base64: string;
  result: {
    osszpontszam: number;
    minosites: string;
  };
}

export default function AdminPage() {
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt az elemzést?')) return;

    setDeleting(id);
    try {
      const { error: dbError } = await supabase
        .from('analyses')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Delete error:', err);
      alert('Nem sikerült törölni az elemzést');
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    async function fetchAnalyses() {
      try {
        const { data, error: dbError } = await supabase
          .from('analyses')
          .select('id, created_at, test_level, logo_base64, result')
          .order('created_at', { ascending: false });

        if (dbError) throw dbError;
        setAnalyses(data || []);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Nem sikerült betölteni az elemzéseket');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalyses();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-info';
    if (score >= 40) return 'text-warning';
    return 'text-error';
  };

  const getTestLevelLabel = (level: string) => {
    return level === 'detailed' ? 'Részletes' : 'Alap';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-accent-yellow animate-spin mx-auto mb-4" />
          <p className="text-text-secondary">Elemzések betöltése...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <Card className="max-w-md text-center">
          <CardContent className="py-8">
            <p className="text-error">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-secondary py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Admin - Összes teszt
          </h1>
          <p className="text-text-secondary">
            Összesen {analyses.length} elemzés
          </p>
        </div>

        {/* Table */}
        {analyses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-text-secondary">Még nincs egyetlen elemzés sem.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bg-tertiary">
                    <th className="text-left py-4 px-4 text-text-muted font-medium text-sm">
                      Logó
                    </th>
                    <th className="text-left py-4 px-4 text-text-muted font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Dátum
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-text-muted font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        Pontszám
                      </div>
                    </th>
                    <th className="text-left py-4 px-4 text-text-muted font-medium text-sm">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Szint
                      </div>
                    </th>
                    <th className="text-right py-4 px-4 text-text-muted font-medium text-sm">
                      Művelet
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((analysis) => (
                    <tr
                      key={analysis.id}
                      className="border-b border-bg-tertiary hover:bg-bg-secondary transition-colors"
                    >
                      {/* Logo thumbnail */}
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 bg-bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                          <img
                            src={`data:image/png;base64,${analysis.logo_base64}`}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4">
                        <span className="text-text-primary text-sm">
                          {formatDate(analysis.created_at)}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${getScoreColor(analysis.result.osszpontszam)}`}>
                            {analysis.result.osszpontszam}
                          </span>
                          <span className="text-text-muted text-sm">/100</span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {analysis.result.minosites}
                        </span>
                      </td>

                      {/* Test level */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          analysis.test_level === 'detailed'
                            ? 'bg-highlight-yellow text-highlight-yellow-text'
                            : 'bg-bg-tertiary text-text-secondary'
                        }`}>
                          {getTestLevelLabel(analysis.test_level)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/eredmeny/${analysis.id}`}
                            className="inline-flex items-center gap-1 text-accent-yellow hover:text-accent-yellow-hover font-medium text-sm transition-colors"
                          >
                            Megnyitás
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(analysis.id)}
                            disabled={deleting === analysis.id}
                            className="inline-flex items-center gap-1 text-error hover:text-red-700 font-medium text-sm transition-colors disabled:opacity-50"
                          >
                            {deleting === analysis.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
