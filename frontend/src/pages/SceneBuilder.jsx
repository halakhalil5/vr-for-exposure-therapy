/**
 * Scene Builder Page
 * 
 * Main page for creating and configuring VR therapy scenes.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { 
  FiSave,
  FiPlay,
  FiEye,
  FiMic,
  FiSquare,
  FiX
} from 'react-icons/fi';
import { format } from 'date-fns';
import { patientAPI, sessionAPI, sceneAPI } from '../services/api';
import ScenePreview from '../components/ScenePreview';
import toast from 'react-hot-toast';

const TEMPLATE_TO_ENVIRONMENT = {
  airport: 'airport',
  airplane: 'airplane',
  building: 'building',
  'glass-bridge': 'cliff',
  elevator: 'elevator',
  house: 'house',
  'picture-room': 'picture_room',
  bedroom: 'bedroom'
};

const ENVIRONMENT_TO_TEMPLATE = {
  airport: 'airport',
  airplane: 'airplane',
  building: 'building',
  cliff: 'glass-bridge',
  elevator: 'elevator',
  house: 'house',
  picture_room: 'picture-room',
  // Backward compatibility for older sessions
  'living-room': 'house',
  'indoor-room': 'house',
  'city-street': 'airport',
  rooftop: 'building',
  'cliff-edge': 'glass-bridge',
  cave: 'glass-bridge',
  'picture-room': 'picture-room',
  bedroom: 'bedroom'
};

const PICTURE_ROOM_PROMPT_COUNT = 8;

const buildPictureRoomDescription = (prompts = []) => (
  Array.from({ length: PICTURE_ROOM_PROMPT_COUNT }, (_, index) => (
    `picture ${index + 1} prompt: ${prompts[index] || ''}`.trimEnd()
  )).join('\n')
);

const getPictureRoomPrompts = (description = '') => {
  const prompts = Array(PICTURE_ROOM_PROMPT_COUNT).fill('');
  const lines = String(description || '').split(/\r?\n/);

  lines.forEach((line, fallbackIndex) => {
    const match = line.match(/^picture\s*(\d+)\s*prompt:\s*(.*)$/i);

    if (match) {
      const promptIndex = Number(match[1]) - 1;
      if (promptIndex >= 0 && promptIndex < PICTURE_ROOM_PROMPT_COUNT) {
        prompts[promptIndex] = match[2];
      }
      return;
    }

    // Backward-friendly fallback for old free-form picture room descriptions.
    if (fallbackIndex < PICTURE_ROOM_PROMPT_COUNT && line.trim()) {
      prompts[fallbackIndex] = line.trim();
    }
  });

  return prompts;
};

const PICTURE_ROOM_PROMPT_TEMPLATE = buildPictureRoomDescription();

const SCENE_DESCRIPTION_SUGGESTIONS = {
  airport: [
    'Quiet airport check-in area with clear signage, a few distant passengers, visible exits, and soft announcement sounds.',
    'Boarding gate waiting area with moderate foot traffic, nearby seats, luggage sounds, and a calm path toward the jet bridge.',
    'Security queue scene with organized barriers, friendly staff, predictable movement, and enough open space for grounding breaks.'
  ],
  airplane: [
    'Airplane cabin before takeoff with seated passengers, overhead bin activity, gentle cabin noise, and a visible aisle.',
    'Window seat flight scene with soft engine sound, seatbelt signs, neutral lighting, and a calm flight attendant nearby.',
    'Boarding moment inside the aircraft with people moving slowly through the aisle and clear reassurance cues from staff.'
  ],
  building: [
    'High building lobby leading to upper floors, with elevator doors visible, distant windows, and a gradual height exposure path.',
    'Rooftop terrace with secure railings, city view at a moderate distance, stable flooring, and clear retreat points.',
    'Upper-floor hallway with large windows, soft indoor lighting, and optional steps closer to the view.'
  ],
  'glass-bridge': [
    'Glass bridge entrance with sturdy side rails, a visible stable platform behind the patient, and a mild view through the floor.',
    'Mid-bridge scene with transparent panels, mountain or city depth below, calm wind audio, and wide secure railings.',
    'Short elevated walkway with gradual transparency, clear end point ahead, and reduced motion to support controlled exposure.'
  ],
  elevator: [
    'Small elevator cabin with soft lighting, visible floor buttons, gentle mechanical sound, and doors that remain responsive.',
    'Elevator ride between floors with minimal crowding, smooth movement, and a clear stop indicator above the doors.',
    'Compact elevator with one calm passenger, neutral wall textures, active ventilation sound, and visible emergency controls.'
  ],
  house: [
    'Add one spider on the living room carpet',
    'Add one spider on the living room table.',
    ],
  bedroom: [
    'Add one spider on the bedroom floor.',
    'Add one spider on the bed.',
    ],
  'picture-room': [
  [
    'picture 1 prompt: a calm neutral landscape with soft sunlight, green meadow, blue sky, peaceful atmosphere, no animals present',
    'picture 2 prompt: a very tiny spider far away on a wall in a bright room, barely visible, minimal detail, non-threatening',
    'picture 3 prompt: a small spider with low detail sitting on a simple web in the corner of a room, soft lighting, slightly blurred',
    'picture 4 prompt: a small spider on a web with moderate detail, neutral background, soft natural lighting, calm and non-threatening',
    'picture 5 prompt: a clearer spider on a web outdoors, closer but still small in the frame, natural lighting, balanced composition',
    'picture 6 prompt: a realistic spider on a leaf in daylight, visible details but in a calm natural setting, nature photography style',
    'picture 7 prompt: a close-up realistic spider with visible legs and body texture, centered, sharp focus, slightly intense but still natural',
    'picture 8 prompt: a highly detailed macro close-up of a spider showing eyes and fine textures clearly, filling most of the frame, maximum intensity'
  ].join('\n'),
  [
    'picture 1 prompt: a cozy safe room with warm lighting, soft blankets, calm and relaxing environment, no spider present',
    'picture 2 prompt: a simple cartoon drawing of a spider with rounded shapes and soft lines, friendly and non-threatening',
    'picture 3 prompt: a small real spider at a distance on a wall, low detail, bright and calm indoor setting',
    'picture 4 prompt: a moderately detailed spider on a web in a corner, clear but not close, soft natural lighting',
    'picture 5 prompt: a detailed spider outdoors on a web with safe distance, natural environment, balanced focus and lighting',
    'picture 6 prompt: a close realistic spider on a leaf, high detail, well-lit nature scene, neutral tone',
    'picture 7 prompt: a close-up spider in a realistic indoor setting, clearly visible features, more intense but still contextualized',
    'picture 8 prompt: an extreme close-up macro image of a spider with sharp focus on eyes and legs, full frame, peak exposure intensity'
  ].join('\n')
],
  default: [
    'Controlled exposure scene with clear exits, neutral lighting, calm ambience, and the trigger introduced at a tolerable distance.',
    'Gradual practice environment with predictable movement, a safe starting area, and adjustable trigger proximity.',
    'Therapy-focused scene with grounding cues, low clutter, stable lighting, and exposure elements matched to the chosen intensity.'
  ]
};

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
    sceneTemplate: 'airport',
    environment: 'airport',
    sceneDescription: ''
  });
  const [sceneJSON, setSceneJSON] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingToUnity, setIsSendingToUnity] = useState(false);
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);
  const [isRecordingDescription, setIsRecordingDescription] = useState(false);
  const [isTranscribingDescription, setIsTranscribingDescription] = useState(false);
  const [recordingPromptIndex, setRecordingPromptIndex] = useState(null);
  const [transcribingPromptIndex, setTranscribingPromptIndex] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const recordingTargetRef = useRef({ type: 'description', index: null });

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
            sceneTemplate: session.sceneTemplate || ENVIRONMENT_TO_TEMPLATE[session.environment] || 'airport',
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

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

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

  const handleSceneTemplateChange = (template) => {
    if (template.id === sessionConfig.sceneTemplate) {
      return;
    }

    handleConfigChange('sceneTemplate', template.id);
    handleConfigChange('environment', TEMPLATE_TO_ENVIRONMENT[template.id] || template.environment);
    setShowDescriptionSuggestions(false);

    if (template.id === 'picture-room') {
      handleConfigChange('sceneDescription', PICTURE_ROOM_PROMPT_TEMPLATE);
    } else {
      handleConfigChange('sceneDescription', '');
    }
  };

  const currentDescriptionSuggestions =
    SCENE_DESCRIPTION_SUGGESTIONS[sessionConfig.sceneTemplate] ||
    SCENE_DESCRIPTION_SUGGESTIONS[sessionConfig.environment] ||
    SCENE_DESCRIPTION_SUGGESTIONS.default;

  const handlePictureRoomPromptChange = (index, value) => {
    const nextPrompts = getPictureRoomPrompts(sessionConfig.sceneDescription);
    nextPrompts[index] = value;
    handleConfigChange('sceneDescription', buildPictureRoomDescription(nextPrompts));
  };

  const stopSceneDescriptionRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === 'recording') {
      recorder.stop();
    }
  };

  const startSceneDescriptionRecording = async (promptIndex = null) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Microphone recording is not supported in this browser');
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      toast.error('Audio recording is not supported in this browser');
      return;
    }

    try {
      const recordingTarget = Number.isInteger(promptIndex)
        ? { type: 'picturePrompt', index: promptIndex }
        : { type: 'description', index: null };
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      audioChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingTargetRef.current = recordingTarget;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        toast.error('Microphone recording failed');
        setIsRecordingDescription(false);
        setRecordingPromptIndex(null);
      };

      recorder.onstop = async () => {
        const stoppedTarget = recordingTargetRef.current;
        setIsRecordingDescription(false);
        setRecordingPromptIndex(null);
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        });
        audioChunksRef.current = [];

        if (!audioBlob.size) {
          toast.error('No audio was recorded');
          return;
        }

        const formData = new FormData();
        formData.append('audio', audioBlob, 'scene-description.webm');

        try {
          setIsTranscribingDescription(true);
          setTranscribingPromptIndex(stoppedTarget.type === 'picturePrompt' ? stoppedTarget.index : null);
          const response = await sceneAPI.speechToText(formData);
          const text = response?.text || response?.data?.text || '';

          if (!text.trim()) {
            toast.error('No speech was detected in the recording');
            return;
          }

          if (stoppedTarget.type === 'picturePrompt') {
            handlePictureRoomPromptChange(stoppedTarget.index, text.trim());
          } else {
            handleConfigChange('sceneDescription', text.trim());
          }
          toast.success('Audio transcribed');
        } catch (error) {
          console.error('Speech-to-text failed:', error);
          toast.error(error?.response?.data?.message || 'Failed to transcribe audio');
        } finally {
          setIsTranscribingDescription(false);
          setTranscribingPromptIndex(null);
        }
      };

      recorder.start();
      setIsRecordingDescription(true);
      setRecordingPromptIndex(recordingTarget.type === 'picturePrompt' ? recordingTarget.index : null);
      toast.success('Recording started');
    } catch (error) {
      console.error('Microphone permission error:', error);
      toast.error('Microphone permission was denied or unavailable');
    }
  };

  const handleSceneDescriptionRecordingToggle = (promptIndex = null) => {
    if (isTranscribingDescription) {
      return;
    }

    if (isRecordingDescription) {
      const currentTarget = recordingTargetRef.current;
      const isSamePicturePrompt = currentTarget.type === 'picturePrompt' && currentTarget.index === promptIndex;
      const isSameDescription = currentTarget.type === 'description' && promptIndex == null;

      if (isSamePicturePrompt || isSameDescription) {
        stopSceneDescriptionRecording();
      }
    } else {
      startSceneDescriptionRecording(promptIndex);
    }
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
  const pictureRoomPrompts = isPictureRoomTemplate
    ? getPictureRoomPrompts(sessionConfig.sceneDescription)
    : [];

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
                    onClick={() => handleSceneTemplateChange(template)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      sessionConfig.sceneTemplate === template.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-sm text-gray-900">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    {template.recommendedForText && (
                      <p className="text-xs font-semibold text-emerald-700 mt-2">
                        Recommended for {template.recommendedForText}
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
              <div className="relative mb-2 flex items-center justify-between gap-3">
                <label className="block text-sm font-medium text-gray-700">Scene Description</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDescriptionSuggestions(prev => !prev)}
                    className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                  >
                    Suggestions
                  </button>
                  {!isPictureRoomTemplate && (
                    <button
                      type="button"
                      onClick={() => handleSceneDescriptionRecordingToggle()}
                      disabled={isTranscribingDescription}
                      aria-label={isRecordingDescription ? 'Stop recording scene description' : 'Record scene description with microphone'}
                      title={isRecordingDescription ? 'Stop recording' : 'Record with microphone'}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
                        isRecordingDescription
                          ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isRecordingDescription ? <FiSquare className="h-3.5 w-3.5" /> : <FiMic className="h-3.5 w-3.5" />}
                      <span>{isRecordingDescription ? 'Stop' : 'Mic'}</span>
                    </button>
                  )}
                </div>

                {showDescriptionSuggestions && (
                  <div className="absolute right-0 top-8 z-20 w-full max-w-md rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-gray-900">Choose a scene description</p>
                      <button
                        type="button"
                        onClick={() => setShowDescriptionSuggestions(false)}
                        className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label="Close suggestions"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="max-h-64 space-y-2 overflow-y-auto">
                      {currentDescriptionSuggestions.map((suggestion, index) => (
                        <button
                          key={`${sessionConfig.sceneTemplate}-suggestion-${index}`}
                          type="button"
                          onClick={() => {
                            handleConfigChange('sceneDescription', suggestion);
                            setShowDescriptionSuggestions(false);
                          }}
                          className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-left text-xs leading-5 text-gray-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-800"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {isPictureRoomTemplate ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {pictureRoomPrompts.map((prompt, index) => (
                    <div key={`picture-prompt-${index + 1}`}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <label className="block text-xs font-semibold text-gray-600">
                          Picture {index + 1} prompt
                        </label>
                        <button
                          type="button"
                          onClick={() => handleSceneDescriptionRecordingToggle(index)}
                          disabled={
                            isTranscribingDescription ||
                            (isRecordingDescription && recordingPromptIndex !== index)
                          }
                          aria-label={
                            recordingPromptIndex === index
                              ? `Stop recording picture ${index + 1} prompt`
                              : `Record picture ${index + 1} prompt with microphone`
                          }
                          title={recordingPromptIndex === index ? 'Stop recording' : 'Record with microphone'}
                          className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md border text-xs font-medium transition ${
                            recordingPromptIndex === index
                              ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700'
                          } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                          {recordingPromptIndex === index ? (
                            <FiSquare className="h-3.5 w-3.5" />
                          ) : (
                            <FiMic className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <textarea
                        value={prompt}
                        onChange={(e) => handlePictureRoomPromptChange(index, e.target.value)}
                        placeholder={`Describe image ${index + 1}...`}
                        className="form-textarea h-20 w-full resize-none text-sm"
                      />
                      <div className="mt-1 min-h-4 text-xs font-medium">
                        {recordingPromptIndex === index && (
                          <span className="text-red-600">Recording...</span>
                        )}
                        {transcribingPromptIndex === index && (
                          <span className="text-primary-700">Processing audio...</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <textarea
                value={sessionConfig.sceneDescription}
                onChange={(e) => handleConfigChange('sceneDescription', e.target.value)}
                placeholder={isPictureRoomTemplate
                  ? PICTURE_ROOM_PROMPT_TEMPLATE
                  : 'Describe the scene in detail for this patient and session intensity...\n\nExamples:\n• Start near the entrance with clear exits visible\n• Keep initial trigger distance moderate, then gradually reduce\n• Maintain calm ambient sounds and neutral lighting'}
                className="form-textarea w-full h-32 text-sm"
              />
              )}
              <div className="mt-2 min-h-5 text-xs font-medium">
                {!isPictureRoomTemplate && isRecordingDescription && (
                  <span className="text-red-600">Recording...</span>
                )}
                {!isPictureRoomTemplate && isTranscribingDescription && (
                  <span className="text-primary-700">Processing audio...</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {isPictureRoomTemplate
                  ? 'Fill all eight picture prompts. These prompts are included in the environment payload sent to Unity.'
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
