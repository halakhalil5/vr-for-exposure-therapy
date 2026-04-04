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
  airport: 'airport'
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
  airport: 'airport'
};

const SceneBuilder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientId = searchParams.get('patient');
  const sessionId = searchParams.get('session');

  const [patients, setPatients] = useState([]);
  const [sceneTemplates, setSceneTemplates] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(patientId || '');
  const [sessionConfig, setSessionConfig] = useState({
    phobia: '',
    intensity: 5,
    sceneTemplate: 'living-room',
    environment: 'living-room',
    sceneDescription: ''
  });
  const [sceneJSON, setSceneJSON] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
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
        if (patientId) {
          setSelectedPatient(patientId);
          const patient = patientsResponse.data?.find(p => p._id === patientId);
          if (patient?.phobia) {
            setSessionConfig(prev => ({ ...prev, phobia: patient.phobia }));
          }
        }
      } catch (error) {
        console.error('Error loading setup data:', error);
      }
    };

    loadInitialData();
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
        sceneTemplate: sessionConfig.sceneTemplate,
        environment: sessionConfig.environment,
        sceneDescription: sessionConfig.sceneDescription
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

  // Send existing scene JSON directly to Unity
  const handleSendToUnity = async () => {
    if (!sceneJSON) {
      toast.error('Generate a scene first');
      return;
    }

    try {
      setIsSendingToUnity(true);
      const payload = sessionId
        ? { sessionId }
        : { sceneJSON };

      const response = await sceneAPI.build(payload);
      if (response?.data?.previewURL) {
        setPreviewURL(response.data.previewURL);
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
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      sessionConfig.sceneTemplate === template.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Slider */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Intensity Level</label>
                <span className={`text-sm font-semibold ${
                  sessionConfig.intensity <= 3 ? 'text-green-600' :
                  sessionConfig.intensity <= 6 ? 'text-yellow-600' : 'text-red-600'
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
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Minimal</span>
                <span>Moderate</span>
                <span>Maximum</span>
              </div>
            </div>

            {/* Scene Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scene Description</label>
              <textarea
                value={sessionConfig.sceneDescription}
                onChange={(e) => handleConfigChange('sceneDescription', e.target.value)}
                placeholder="Describe the scene in detail for this patient and session intensity...&#10;&#10;Examples:&#10;• Start near the entrance with clear exits visible&#10;• Keep initial trigger distance moderate, then gradually reduce&#10;• Maintain calm ambient sounds and neutral lighting"
                className="form-textarea w-full h-32 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                This description guides AI scene generation while keeping the selected template.
              </p>
            </div>
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
                isLoading={isSendingToUnity}
                onEdit={() => {}}
                onSendToUnity={handleSendToUnity}
              />
            ) : (
              <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">
                  Generate a scene to see preview
                </p>
              </div>
            )}
          </div>


{/* remove after testong */}
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
