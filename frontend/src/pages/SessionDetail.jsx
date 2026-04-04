/**
 * Session Detail Page
 * 
 * View and manage individual session details.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiEdit2, 
  FiPlay, 
  FiCheck,
  FiX,
  FiUser,
  FiActivity
} from 'react-icons/fi';
import { format } from 'date-fns';
import { sceneAPI, sessionAPI } from '../services/api';
import ScenePreview from '../components/ScenePreview';
import BiofeedbackDisplay from '../components/BiofeedbackDisplay';
import toast from 'react-hot-toast';

const SessionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Load session
  useEffect(() => {
    const loadSession = async () => {
      try {
        setIsLoading(true);
        const response = await sessionAPI.getById(id);
        setSession(response.data);
      } catch (error) {
        console.error('Error loading session:', error);
        navigate('/sessions');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, [id, navigate]);

  // Status actions
  const handleStart = async () => {
    try {
      setIsStarting(true);
      // Load this session's configured scene into Unity before marking the session in progress.
      await sceneAPI.build({
        sessionId: id,
        intensity: session?.intensity || 5
      });
      await sessionAPI.start(id);
      setSession(prev => ({ ...prev, status: 'in-progress' }));
    } catch (error) {
      console.error('Error starting session:', error);
      toast.error(error?.response?.data?.message || 'Failed to load scene in Unity');
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = async () => {
    try {
      await sessionAPI.complete(id);
      setSession(prev => ({ ...prev, status: 'completed' }));
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  const handleCancel = async () => {
    try {
      await sessionAPI.update(id, { status: 'cancelled' });
      setSession(prev => ({ ...prev, status: 'cancelled' }));
    } catch (error) {
      console.error('Error cancelling session:', error);
    }
  };

  // Status badge styling
  const getStatusStyle = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-600',
      scheduled: 'bg-blue-100 text-blue-600',
      'in-progress': 'bg-yellow-100 text-yellow-600',
      completed: 'bg-green-100 text-green-600',
      cancelled: 'bg-red-100 text-red-600'
    };
    return `badge ${styles[status] || 'bg-gray-100 text-gray-600'}`;
  };

  const formatTemplateName = (templateId) => {
    if (!templateId) return '-';
    return templateId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        <div className="card h-64 animate-pulse bg-gray-100"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Session not found</p>
        <Link to="/sessions" className="btn-primary mt-4">
          Back to Sessions
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/sessions')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Session Details
            </h1>
            <p className="text-gray-500 mt-1">
              {format(new Date(session.date), 'MMMM d, yyyy h:mm a')}
            </p>
          </div>
        </div>

        {/* Status Actions */}
        <div className="flex items-center space-x-3">
          <span className={getStatusStyle(session.status)}>
            {session.status}
          </span>
          
          {session.status === 'scheduled' && (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="btn-primary flex items-center space-x-2 disabled:opacity-60"
            >
              <FiPlay className="w-4 h-4" />
              <span>{isStarting ? 'Loading Scene...' : 'Start Session'}</span>
            </button>
          )}
          
          {session.status === 'in-progress' && (
            <>
              <button onClick={handleComplete} className="btn-primary flex items-center space-x-2">
                <FiCheck className="w-4 h-4" />
                <span>Complete</span>
              </button>
              <button onClick={handleCancel} className="btn-danger flex items-center space-x-2">
                <FiX className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Session Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Session Information
          </h2>
          
          {/* Patient */}
          <div className="flex items-center space-x-3 mb-4 pb-4 border-b">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <FiUser className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Patient</p>
              <Link 
                to={`/patients/${session.patientId?._id}`}
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                {session.patientId?.name || 'Unknown'}
              </Link>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Phobia Type</p>
              <p className="font-medium capitalize">{session.phobia}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Intensity Level</p>
              <p className="font-medium">{session.intensity}/10</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Environment</p>
              <p className="font-medium capitalize">{session.environment}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Template</p>
              <p className="font-medium">{formatTemplateName(session.sceneTemplate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">{session.duration || '-'} min</p>
            </div>
          </div>

          {session.sceneDescription && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">Scene Description</p>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                {session.sceneDescription}
              </p>
            </div>
          )}

          {/* Patient Feedback */}
          {session.patientFeedback && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-2">Patient Feedback</p>
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-sm text-gray-500">Anxiety (Before)</p>
                  <p className="font-medium">{session.patientFeedback.anxietyBefore}/10</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Anxiety (After)</p>
                  <p className="font-medium">{session.patientFeedback.anxietyAfter}/10</p>
                </div>
              </div>
              {session.patientFeedback.notes && (
                <p className="text-sm text-gray-600 mt-2">
                  {session.patientFeedback.notes}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Scene Preview */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Scene Preview
          </h2>
          <ScenePreview 
            previewURL={session.previewURL}
            sceneJSON={session.sceneJSON}
            onEdit={() => navigate(`/scene-builder?session=${id}`)}
          />
        </div>
      </div>

      {/* Biofeedback Data */}
      {session.biofeedbackData && session.biofeedbackData.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
            <FiActivity className="w-5 h-5 text-primary-600" />
            <span>Biofeedback Data</span>
          </h2>
          <BiofeedbackDisplay data={session.biofeedbackData} />
        </div>
      )}

    </div>
  );
};

export default SessionDetail;
