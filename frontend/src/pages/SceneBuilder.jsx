/**
 * Scene Builder Page
 * 
 * Main page for creating and configuring VR therapy scenes.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  FiRefreshCw,
  FiSave,
  FiPlay,
  FiEye
} from 'react-icons/fi';
import { format } from 'date-fns';
import { patientAPI, sessionAPI, sceneAPI } from '../services/api';
import ScenePreview from '../components/ScenePreview';
import toast from 'react-hot-toast';

const TEMPLATE_TO_ENVIRONMENT = {
  'living-room': 'living-room',
  'road-with-skyscrappers': 'city-street',
  rooftop: 'rooftop',
  'cliff-edge': 'cliff-edge',
  building: 'building',
  cave: 'cave',
  elevator: 'elevator',
  airplane: 'airplane',
  airport: 'airport',
  'picture-room': 'picture-room'
};

const ENVIRONMENT_TO_TEMPLATE = {
  'living-room': 'living-room',
  'indoor-room': 'living-room',
  'city-street': 'road-with-skyscrappers',
  rooftop: 'rooftop',
  'cliff-edge': 'cliff-edge',
  building: 'building',
  cave: 'cave',
  elevator: 'elevator',
  airplane: 'airplane',
  airport: 'airport',
  'picture-room': 'picture-room'
};

const PICTURE_ROOM_PROMPT_TEMPLATE = [
  'picture 1 prompt:',
  'picture 2 prompt:',
  'picture 3 prompt:',
  'picture 4 prompt:',
  'picture 5 prompt:',
  'picture 6 prompt:',
  'picture 7 prompt:'
].join('\n');

const SceneBuilder = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const sessionId = searchParams.get('session');
  const initialPatientId = location.state?.patient?._id || patientId || '';

  const [patients, setPatients] = useState([]);
  const [sceneTemplates, setSceneTemplates] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(initialPatientId);
  const [patientSessionHistory, setPatientSessionHistory] = useState([]);
  const [sessionConfig, setSessionConfig] = useState({
    phobia: '',
    intensity: 5,
    sceneTemplate: 'living-room',
    environment: 'living-room',
    sceneDescription: ''
  });
  const [sceneJSON, setSceneJSON] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingToUnity, setIsSendingToUnity] = useState(false);

  // Load patients and templates
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [patientsResponse, templatesResponse] = await Promise.all([
          patientAPI.getAll(),
          sceneAPI.getTemplates()
        ]);
        setPatients(patientsResponse.data || []);
        setSceneTemplates(templatesResponse.data || []);
        
        // Auto-select patient if provided
        if (initialPatientId) {
          setSelectedPatient(initialPatientId);
          const patient = patientsResponse.data?.find(p => p._id === initialPatientId);
          if (patient?.phobia) {
            setSessionConfig(prev => ({ ...prev, phobia: patient.phobia }));
          }
        }
      } catch (error) {
        console.error('Error loading setup data:', error);
      }
    };

    loadInitialData();
  }, [initialPatientId]);

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
            sceneTemplate: session.sceneTemplate || ENVIRONMENT_TO_TEMPLATE[session.environment] || 'living-room',
            environment: session.environment,
            sceneDescription: session.sceneDescription || ''
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

  // Load patient session history so the latest intensity can be reused.
  useEffect(() => {
    if (!selectedPatient) {
      setPatientSessionHistory([]);
      return;
    }

    const loadPatientHistory = async () => {
      try {
        const response = await patientAPI.getSessions(selectedPatient, { limit: 10 });
        const history = (response.data || []).filter((item) => item._id !== sessionId);
        setPatientSessionHistory(history);

        if (!sessionId) {
          const previousIntensity = history[0]?.intensity;
          setSessionConfig(prev => ({
            ...prev,
            intensity: previousIntensity ?? 5
          }));
        }
      } catch (error) {
        console.error('Error loading patient session history:', error);
        setPatientSessionHistory([]);
      }
    };

    loadPatientHistory();
  }, [selectedPatient, sessionId]);

  // Save session
  const handleSaveSession = async (status = 'draft') => {
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }

    if (!sceneJSON) {
      toast.error('Please send the scene to Unity first');
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

  // Send existing scene JSON directly to Unity
  const handleSendToUnity = async () => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }

    try {
      setIsSendingToUnity(true);
      const payload = {
        environment: sessionConfig.environment,
        description: sessionConfig.sceneDescription,
        intensity: sessionConfig.intensity
      };

      if (sessionId) {
        payload.sessionId = sessionId;
      }

      const response = await sceneAPI.build(payload);
      if (response?.data?.unityRequest) {
        console.log('Unity request payload (build-scene):', response.data.unityRequest);
      }
      if (response?.data?.previewURL) {
        setPreviewURL(response.data.previewURL);
      }
      if (response?.data?.unityRequest) {
        setSceneJSON(response.data.unityRequest);
      }
      toast.success('Scene sent to Unity');
    } catch (error) {
      console.error('Error sending scene to Unity:', error);
      toast.error(error?.response?.data?.message || 'Failed to send scene to Unity');
    } finally {
      setIsSendingToUnity(false);
    }
  };

  const selectedPatientData = patients.find(patient => patient._id === selectedPatient);
  const isPictureRoomTemplate = sessionConfig.sceneTemplate === 'picture-room';

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

          {selectedPatientData && (
            <div className="card bg-primary-50 border border-primary-100">
              <p className="text-sm text-primary-700">
                <span className="font-semibold">Registered phobia:</span> {selectedPatientData.phobia}
              </p>
              <p className="text-xs text-primary-600 mt-1">
                Phobia is preset from patient registration and cannot be changed here.
              </p>
            </div>
          )}

          {patientSessionHistory.length > 0 && (
            <div className="card border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Previous session intensity log</h2>
                  <p className="text-sm text-gray-500">
                    Latest session used {patientSessionHistory[0].intensity}/10
                  </p>
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(patientSessionHistory[0].date), 'MMM d, yyyy')}
                </span>
              </div>

              <div className="space-y-2">
                {patientSessionHistory.slice(0, 3).map((session) => (
                  <div key={session._id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm border border-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">Intensity {session.intensity}/10</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {session.environment} • {format(new Date(session.date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{session.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Session Configuration */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Session Configuration
            </h2>
            
            {/* Scene Template Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Scene Template</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sceneTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => {
                      handleConfigChange('sceneTemplate', template.id);
                      handleConfigChange('environment', TEMPLATE_TO_ENVIRONMENT[template.id] || template.environment);

                      if (template.id === 'picture-room') {
                        handleConfigChange('sceneDescription', PICTURE_ROOM_PROMPT_TEMPLATE);
                      }
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      sessionConfig.sceneTemplate === template.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    {template.recommendedFor === 'arachnophobia' && (
                      <p className="text-xs font-semibold text-emerald-700 mt-2">
                        Recommended for arachnophobia
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Slider */}
            {!isPictureRoomTemplate && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Intensity Level</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Start from the last recorded setting and adjust if needed.
                  </p>
                </div>
                <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                  sessionConfig.intensity <= 3 ? 'bg-green-100 text-green-700' :
                  sessionConfig.intensity <= 6 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                }`}>
                  {sessionConfig.intensity}/10 ({sessionConfig.intensity <= 3 ? 'Low' : sessionConfig.intensity <= 6 ? 'Medium' : 'High'})
                </span>
              </div>

              <input
                type="range"
                min="1"
                max="10"
                value={sessionConfig.intensity}
                onChange={(e) => handleConfigChange('intensity', parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
              />

              <div className="mt-2 flex justify-between text-xs font-medium text-gray-400">
                <span>Minimal</span>
                <span>Moderate</span>
                <span>Maximum</span>
              </div>
            </div>
            )}

            {/* Scene Description */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Scene Description</label>
              <textarea
                value={sessionConfig.sceneDescription}
                onChange={(e) => handleConfigChange('sceneDescription', e.target.value)}
                placeholder={isPictureRoomTemplate
                  ? PICTURE_ROOM_PROMPT_TEMPLATE
                  : 'Describe the scene in detail for this patient and session intensity...\n\nExamples:\n• Start near the entrance with clear exits visible\n• Keep initial trigger distance moderate, then gradually reduce\n• Maintain calm ambient sounds and neutral lighting'}
                className="form-textarea w-full h-32 text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                {isPictureRoomTemplate
                  ? 'Fill all seven picture prompts. These prompts are included in the environment payload sent to Unity.'
                  : 'This description guides AI scene generation while keeping the selected template.'}
              </p>
            </div>
          </div>

        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
              <FiEye className="w-5 h-5 text-primary-600" />
              <span>Scene Preview</span>
            </h2>
            <ScenePreview 
              previewURL={previewURL}
              sceneJSON={sceneJSON || { environment: sessionConfig.environment, description: sessionConfig.sceneDescription }}
              isLoading={isSendingToUnity}
              onEdit={() => {}}
              onSendToUnity={handleSendToUnity}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneBuilder;
