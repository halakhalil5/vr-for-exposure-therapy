/**
 * Uploaded Reports Page
 *
 * Lists session PDF reports uploaded from Unity and allows therapist downloads.
 */

import { useEffect, useState } from 'react';
import { FiDownload, FiFileText, FiRefreshCw } from 'react-icons/fi';
import { format } from 'date-fns';
import { reportAPI } from '../services/api';

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const UploadedReports = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadReports = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await reportAPI.listUploadedReports({ limit: 200 });
      setReports(response.data || []);
    } catch (error) {
      console.error('Failed to load uploaded reports:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Uploaded Session PDFs</h1>
          <p className="mt-1 text-gray-500">
            Download therapeutic session reports uploaded by the Unity VR application.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary flex items-center"
          onClick={() => loadReports(true)}
          disabled={isRefreshing}
        >
          <FiRefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="h-10 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center">
            <FiFileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="text-lg font-medium text-slate-600">No reports uploaded yet</p>
            <p className="text-sm text-slate-400">
              Unity uploads will appear here after POST /upload-pdf completes successfully.
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="table-header">Report ID</th>
                <th className="table-header">File Name</th>
                <th className="table-header">Uploaded</th>
                <th className="table-header">Size</th>
                <th className="table-header text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {reports.map((report) => (
                <tr key={report.reportId}>
                  <td className="table-cell font-mono text-xs text-slate-600">{report.reportId}</td>
                  <td className="table-cell">{report.fileName}</td>
                  <td className="table-cell">
                    {report.uploadedAt
                      ? format(new Date(report.uploadedAt), 'dd MMM yyyy, HH:mm')
                      : '-'}
                  </td>
                  <td className="table-cell">{formatFileSize(report.sizeBytes)}</td>
                  <td className="table-cell text-right">
                    <a
                      className="btn-outline inline-flex items-center"
                      href={report.downloadUrl || reportAPI.getDownloadUrl(report.reportId)}
                    >
                      <FiDownload className="mr-2 h-4 w-4" />
                      Download PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UploadedReports;