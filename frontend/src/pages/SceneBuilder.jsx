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
  FiEye,
  FiPlus,
  FiMinus
} from 'react-icons/fi';
import { patientAPI, sessionAPI, sceneAPI } from '../services/api';
import ScenePreview from '../components/ScenePreview';
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
    environment: 'indoor-room',
    objectCounts: { triggers: 3, ambient: 5 },
    customInstructions: ''
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
        environment: sessionConfig.environment,
        objectCounts: sessionConfig.objectCounts,
        customInstructions: sessionConfig.customInstructions
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

  // Handle object count changes
  const handleObjectCountChange = (field, delta) => {
    setSessionConfig(prev => ({
      ...prev,
      objectCounts: {
        ...prev.objectCounts,
        [field]: Math.max(0, Math.min(20, prev.objectCounts[field] + delta))
      }
    }));
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
            
            {/* Phobia Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phobia Type</label>
              <select
                value={sessionConfig.phobia}
                onChange={(e) => handleConfigChange('phobia', e.target.value)}
                className="form-select"
              >
                <option value="arachnophobia">Arachnophobia (Spiders)</option>
                <option value="acrophobia">Acrophobia (Heights)</option>
                <option value="claustrophobia">Claustrophobia (Confined Spaces)</option>
                <option value="social-anxiety">Social Anxiety</option>
                <option value="glossophobia">Glossophobia (Public Speaking)</option>
                <option value="aviophobia">Aviophobia (Flying)</option>
                <option value="cynophobia">Cynophobia (Dogs)</option>
                <option value="ophidiophobia">Ophidiophobia (Snakes)</option>
              </select>
            </div>

            {/* Environment Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
              <select
                value={sessionConfig.environment}
                onChange={(e) => handleConfigChange('environment', e.target.value)}
                className="form-select"
              >
                <option value="indoor-room">Indoor Room</option>
                <option value="outdoor-park">Outdoor Park</option>
                <option value="office">Office</option>
                <option value="elevator">Elevator</option>
                <option value="rooftop">Rooftop</option>
                <option value="bridge">Bridge</option>
                <option value="forest">Forest</option>
                <option value="presentation-room">Presentation Room</option>
              </select>
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

            {/* Object Counts */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Scene Objects</label>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-2">Trigger Objects</p>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleObjectCountChange('triggers', -1)}
                      className="p-1 bg-white rounded border hover:bg-gray-100"
                    >
                      <FiMinus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-semibold">{sessionConfig.objectCounts.triggers}</span>
                    <button
                      type="button"
                      onClick={() => handleObjectCountChange('triggers', 1)}
                      className="p-1 bg-white rounded border hover:bg-gray-100"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 mb-2">Ambient Objects</p>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleObjectCountChange('ambient', -1)}
                      className="p-1 bg-white rounded border hover:bg-gray-100"
                    >
                      <FiMinus className="w-4 h-4" />
                    </button>
                    <span className="text-xl font-semibold">{sessionConfig.objectCounts.ambient}</span>
                    <button
                      type="button"
                      onClick={() => handleObjectCountChange('ambient', 1)}
                      className="p-1 bg-white rounded border hover:bg-gray-100"
                    >
                      <FiPlus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Custom Scene Instructions</label>
              <textarea
                value={sessionConfig.customInstructions}
                onChange={(e) => handleConfigChange('customInstructions', e.target.value)}
                placeholder="Add specific instructions for the AI scene generator...&#10;&#10;Examples:&#10;• Place spiders near the window&#10;• Add calming background music&#10;• Include an exit door that's always visible&#10;• Make the lighting dim but not scary"
                className="form-textarea w-full h-32 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                These instructions will guide the AI when generating your scene.
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
