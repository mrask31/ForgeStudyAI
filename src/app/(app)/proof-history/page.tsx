'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';

type ProofReceipt = {
  concept: string;
  dateProven: string;
  retriesBeforePass: number;
  method: string;
};

export default function ProofHistoryPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<ProofReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProofHistory = async () => {
      try {
        // Get active profile from localStorage (existing pattern)
        const activeProfileId = localStorage.getItem('activeProfileId');
        if (!activeProfileId) {
          setError('No active profile selected');
          setIsLoading(false);
          return;
        }

        const res = await fetch(`/api/proof/history?studentId=${activeProfileId}`, {
          credentials: 'include',
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to load proof history');
        }

        const data = await res.json();
        setReceipts(data.receipts || []);
      } catch (err: any) {
        console.error('[Proof History] Load error:', err);
        setError(err.message || 'Failed to load proof history');
      } finally {
        setIsLoading(false);
      }
    };

    loadProofHistory();
  }, [router]);

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading proof history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Proof History</h1>
          <p className="text-sm text-slate-600 mt-1">
            Concepts you have proven through explain-back checkpoints.
          </p>
        </div>

        {receipts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              No concepts proven yet. Keep learning and you will see your progress here.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    Concept
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    Date Proven
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    Retries
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600">
                    Method
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.map((receipt, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-sm text-slate-900">{receipt.concept}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {formatDate(receipt.dateProven)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {receipt.retriesBeforePass}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {receipt.method}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
