import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auditService } from "../services/api";

type HistoryItem = {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: number;
  finishedAt?: number;
  score?: number;
  level?: string;
  verdict?: string;
};

export const HistoryPage = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const response = await auditService.getHistory(50);
        setItems(response.data || []);
      } catch (error) {
        console.error("Failed to load audit history", error);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  return (
    <div className="space-y-6 py-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit History</h1>
        <p className="text-gray-600 mt-1">
          Revisit previous runs and jump back into results quickly.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-600">
          Loading history...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-gray-600">
          No audit runs yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.jobId}
              className="bg-white rounded-lg shadow border border-gray-100 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Job ID: {item.jobId}</p>
                  <p className="font-semibold text-gray-900">
                    {item.score !== undefined
                      ? `${item.score}/10`
                      : "Score pending"}
                    {item.level ? ` • ${item.level}` : ""}
                  </p>
                  {item.verdict && (
                    <p className="text-sm text-gray-600 mt-1">{item.verdict}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold capitalize">
                    {item.status}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <Link
                  to={`/results?jobId=${encodeURIComponent(item.jobId)}`}
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
                >
                  Open Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
