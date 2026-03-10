/**
 * Scene Builder Page
 * 
 * Main page for creating and configuring VR therapy scenes.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FiSend, 
  FiRefreshCw,
  FiSave,
  FiPlay,
  FiEye
} from 'react-icons/fi';
import { patientAPI, sessionAPI, sceneAPI } from '../services/api';
import ScenePreview from '../components/ScenePreview';
import SessionForm from '../components/SessionForm';
import toast from 'react-hot-toast';

const SceneBuilder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const sessionId = searchParams.get('session');

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(patientId || '');
  const [sessionConfig, setSessionConfig] = useState({
    phobia: 'arachnophobia',
    intensity: 5,
    environment: 'indoor'
  });
  const [sceneJSON, setSceneJSON] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load patients
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const response = await patientAPI.getAll();
        setPatients(response.data || []);
        
        // Auto-select patient if provided
        if (patientId) {
          setSelectedPatient(patientId);
          const patient = response.data?.find(p => p._id === patientId);
          if (patient?.phobia) {
            setSessionConfig(prev => ({ ...prev, phobia: patient.phobia }));
          }
        }
      } catch (error) {
        console.error('Error loading patients:', error);
      }
    };

    loadPatients();
  }, [patientId]);

  // Load existing session if editing
  useEffect(() => {
    if (sessionId) {
      const loadSession = async () => {
        try {
          const response = await sessionAPI.getById(sessionId);
          const session = response.data;
          setSelectedPatient(session.patientId?._id || '');
          setSessionConfig({
            phobia: session.phobia,
            intensity: session.intensity,
            environment: session.environment
          });
          setSceneJSON(session.sceneJSON);
          setPreviewURL(session.previewURL);
        } catch (error) {
          console.error('Error loading session:', error);
        }
      };
      loadSession();
    }
  }, [sessionId]);

  // Generate scene using LLM
  const handleGenerateScene = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    try {
      setIsGenerating(true);
      const response = await sceneAPI.generate({
        phobia: sessionConfig.phobia,
        intensity: sessionConfig.intensity,
        environment: sessionConfig.environment
      });
      
      setSceneJSON(response.data.sceneJSON);
      setPreviewURL(response.data.previewURL);
      toast.success('Scene generated successfully!');
    } catch (error) {
      console.error('Error generating scene:', error);
      toast.error('Failed to generate scene');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save session
  const handleSaveSession = async (status = 'draft') => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    if (!sceneJSON) {
      toast.error('Please generate a scene first');
      return;
    }

    try {
      setIsSaving(true);
      
      const sessionData = {
        patientId: selectedPatient,
        ...sessionConfig,
        sceneJSON,
        previewURL,
        status
      };

      let response;
      if (sessionId) {
        response = await sessionAPI.update(sessionId, sessionData);
        toast.success('Session updated!');
      } else {
        response = await sessionAPI.create(sessionData);
        toast.success('Session created!');
      }

      navigate(`/sessions/${response.data._id}`);
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle form changes
  const handleConfigChange = (field, value) => {
    setSessionConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scene Builder</h1>
          <p className="text-gray-500 mt-1">
            Configure and generate VR therapy scenes
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => handleSaveSession('draft')}
            disabled={isSaving || !sceneJSON}
            className="btn-secondary flex items-center space-x-2"
          >
            <FiSave className="w-4 h-4" />
            <span>Save Draft</span>
          </button>
          <button
            onClick={() => handleSaveSession('scheduled')}
            disabled={isSaving || !sceneJSON}
            className="btn-primary flex items-center space-x-2"
          >
            <FiPlay className="w-4 h-4" />
            <span>Schedule Session</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Patient Selection */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Patient
            </h2>
            <select
              value={selectedPatient}
              onChange={(e) => {
                setSelectedPatient(e.target.value);
                const patient = patients.find(p => p._id === e.target.value);
                if (patient?.phobia) {
                  handleConfigChange('phobia', patient.phobia);
                }
              }}
              className="form-select"
            >
              <option value="">Choose a patient...</option>
              {patients.map(patient => (
                <option key={patient._id} value={patient._id}>
                  {patient.name} - {patient.phobia}
                </option>
              ))}
            </select>
          </div>

          {/* Session Configuration */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Session Configuration
            </h2>
            <SessionForm
              config={sessionConfig}
              onChange={handleConfigChange}
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateScene}
            disabled={isGenerating || !selectedPatient}
            className="btn-primary w-full flex items-center justify-center space-x-2 py-3"
          >
            {isGenerating ? (
              <>
                <FiRefreshCw className="w-5 h-5 animate-spin" />
                <span>Generating Scene...</span>
              </>
            ) : (
              <>
                <FiSend className="w-5 h-5" />
                <span>Generate Scene with AI</span>
              </>
            )}
          </button>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FiEye className="w-5 h-5 text-primary-600" />
              <span>Scene Preview</span>
            </h2>
            
            {sceneJSON ? (
              <ScenePreview 
                previewURL={previewURL}
                sceneJSON={sceneJSON}
                onEdit={() => {}}
              />
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">
                  Generate a scene to see preview
                </p>
              </div>
            )}
          </div>

          {/* Scene JSON */}
          {sceneJSON && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Scene Configuration (JSON)
              </h2>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm max-h-64">
                {JSON.stringify(sceneJSON, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneBuilder;
