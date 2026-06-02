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
  FiMic,
  FiSquare,
  FiX,
  FiPlus,
  FiTrash2
} from 'react-icons/fi';
import { format } from 'date-fns';
import { patientAPI, sessionAPI, sceneAPI } from '../services/api';
import toast from 'react-hot-toast';

const TEMPLATE_TO_ENVIRONMENT = {
  airport: 'airport',
  airplane: 'airplane',
  building: 'building',
  'word-room': 'word_room',
  elevator: 'elevator',
  house: 'house',
  'picture-room': 'picture_room',
  bedroom: 'bedroom'
};

const ENVIRONMENT_TO_TEMPLATE = {
  airport: 'airport',
  airplane: 'airplane',
  building: 'building',
  word_room: 'word-room',
  elevator: 'elevator',
  house: 'house',
  picture_room: 'picture-room',
  // Backward compatibility for older sessions
  'living-room': 'house',
  'indoor-room': 'house',
  'city-street': 'airport',
  rooftop: 'building',
  cliff: 'word-room',
  'cliff-edge': 'word-room',
  cave: 'word-room',
  'glass-bridge': 'word-room',
  'picture-room': 'picture-room',
  bedroom: 'bedroom'
};

const buildPictureRoomDescription = (prompts = []) => (
  prompts.length > 0
    ? prompts.map((prompt, index) => `picture ${index + 1} prompt: ${prompt || ''}`.trimEnd()).join('\n')
    : ''
);

const getPictureRoomPrompts = (description = '') => {
  const prompts = [];
  const lines = String(description || '').split(/\r?\n/);

  lines.forEach((line, fallbackIndex) => {
    const match = line.match(/^picture\s*(\d+)\s*prompt:\s*(.*)$/i);

    if (match) {
      const promptIndex = Number(match[1]) - 1;
      if (promptIndex >= 0) {
        prompts[promptIndex] = match[2];
      }
      return;
    }

    // Backward-friendly fallback for old free-form picture room descriptions.
    if (line.trim()) {
      prompts[fallbackIndex] = line.trim();
    }
  });

  return prompts.length > 0 ? prompts : [''];
};

const filterPictureRoomDescription = (description = '') => {
  const prompts = getPictureRoomPrompts(description);
  const filledPrompts = prompts.filter(p => p.trim());
  return filledPrompts
    .map((prompt, index) => `picture ${index + 1} prompt: ${prompt}`)
    .join('\n');
};

const PICTURE_ROOM_PROMPT_TEMPLATE = buildPictureRoomDescription(['', '']);

const buildWordRoomDescription = (prompts = []) => (
  prompts.length > 0
    ? prompts.map((prompt, index) => `word ${index + 1} prompt: ${prompt || ''}`.trimEnd()).join('\n')
    : ''
);

const getWordRoomPrompts = (description = '') => {
  const prompts = [];
  const lines = String(description || '').split(/\r?\n/);

  lines.forEach((line, fallbackIndex) => {
    const match = line.match(/^word\s*(\d+)\s*prompt:\s*(.*)$/i);

    if (match) {
      const promptIndex = Number(match[1]) - 1;
      if (promptIndex >= 0) {
        prompts[promptIndex] = match[2];
      }
      return;
    }

    if (line.trim()) {
      prompts[fallbackIndex] = line.trim();
    }
  });

  return prompts.length > 0 ? prompts : [''];
};

const filterWordRoomDescription = (description = '') => {
  const prompts = getWordRoomPrompts(description);
  const filledPrompts = prompts.filter(p => p.trim());
  return filledPrompts
    .map((prompt, index) => `word ${index + 1} prompt: ${prompt}`)
    .join('\n');
};

const WORD_ROOM_PROMPT_TEMPLATE = buildWordRoomDescription(['', '']);

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
  'word-room': [
  [
    'word 1 prompt: spider',
    'word 2 prompt: web'
  ].join('\n'),
  [
    'word 1 prompt: spider',
    'word 2 prompt: tarantula'
  ].join('\n')
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
    'picture 1 prompt:ultra realistic spider, macro photography, detailed hairs, realistic eyes, natural lighting, sharp focus, photorealistic, 8k, high detail, shallow depth of field',
    'picture 2 prompt:ultra realistic spider, macro photography, detailed hairs, realistic eyes, natural lighting, sharp focus, photorealistic, 8k, high detail, shallow depth of field'
  ].join('\n'),
  [
    'picture 1 prompt: ultra realistic spider, macro photography, detailed hairs, realistic eyes, natural lighting, sharp focus, photorealistic, 8k, high detail, shallow depth of field',
    'picture 2 prompt: photorealistic spider on a leaf, natural lighting, detailed textures, sharp focus, 8k resolution, high detail, shallow depth of field'
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
    intensity: 3,
    sceneTemplate: 'airport',
    environment: 'airport',
    sceneDescription: '',
    presentationMode: 'audio + text'
  });
  const [sceneJSON, setSceneJSON] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingToUnity, setIsSendingToUnity] = useState(false);
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false);
  const [showWordSuggestions, setShowWordSuggestions] = useState(false);
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
          const template = session.sceneTemplate || ENVIRONMENT_TO_TEMPLATE[session.environment] || 'airport';
          setSessionConfig({
            phobia: session.phobia,
            intensity: session.intensity,
            sceneTemplate: template,
            environment: session.environment,
            sceneDescription: session.sceneDescription || '',
            presentationMode: session.presentationMode || 'audio + text'
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
            intensity: previousIntensity ?? 3
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
        presentationMode: sessionConfig.presentationMode,
        sceneDescription: isPictureRoomTemplate
          ? filterPictureRoomDescription(sessionConfig.sceneDescription)
          : isWordRoomTemplate
          ? filterWordRoomDescription(sessionConfig.sceneDescription)
          : sessionConfig.sceneDescription,
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
      handleConfigChange('presentationMode', 'audio + text');
    } else if (template.id === 'word-room') {
      handleConfigChange('sceneDescription', WORD_ROOM_PROMPT_TEMPLATE);
      handleConfigChange('presentationMode', 'audio + text');
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

  const handleAddPictureRoomPrompt = () => {
    const nextPrompts = [...getPictureRoomPrompts(sessionConfig.sceneDescription), ''];
    handleConfigChange('sceneDescription', buildPictureRoomDescription(nextPrompts));
  };

  const handleRemovePictureRoomPrompt = (index) => {
    const nextPrompts = getPictureRoomPrompts(sessionConfig.sceneDescription).filter((_, promptIndex) => promptIndex !== index);
    handleConfigChange('sceneDescription', buildPictureRoomDescription(nextPrompts.length > 0 ? nextPrompts : ['']));
  };

  const handleWordRoomPromptChange = (index, value) => {
    const nextPrompts = getWordRoomPrompts(sessionConfig.sceneDescription);
    nextPrompts[index] = value;
    handleConfigChange('sceneDescription', buildWordRoomDescription(nextPrompts));
  };

  const handleAddWordRoomPrompt = () => {
    const nextPrompts = [...getWordRoomPrompts(sessionConfig.sceneDescription), ''];
    handleConfigChange('sceneDescription', buildWordRoomDescription(nextPrompts));
  };

  const handleRemoveWordRoomPrompt = (index) => {
    const nextPrompts = getWordRoomPrompts(sessionConfig.sceneDescription).filter((_, promptIndex) => promptIndex !== index);
    handleConfigChange('sceneDescription', buildWordRoomDescription(nextPrompts.length > 0 ? nextPrompts : ['']));
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
        ? { type: sessionConfig.sceneTemplate === 'word-room' ? 'wordPrompt' : 'picturePrompt', index: promptIndex }
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
          setTranscribingPromptIndex(
            stoppedTarget.type === 'picturePrompt' || stoppedTarget.type === 'wordPrompt'
              ? stoppedTarget.index
              : null
          );
          const response = await sceneAPI.speechToText(formData);
          const text = response?.text || response?.data?.text || '';

          if (!text.trim()) {
            toast.error('No speech was detected in the recording');
            return;
          }

          if (stoppedTarget.type === 'picturePrompt') {
            handlePictureRoomPromptChange(stoppedTarget.index, text.trim());
          } else if (stoppedTarget.type === 'wordPrompt') {
            handleWordRoomPromptChange(stoppedTarget.index, text.trim());
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
      setRecordingPromptIndex(
        recordingTarget.type === 'picturePrompt' || recordingTarget.type === 'wordPrompt'
          ? recordingTarget.index
          : null
      );
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
      const isSamePicturePrompt = (currentTarget.type === 'picturePrompt' || currentTarget.type === 'wordPrompt') && currentTarget.index === promptIndex;
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
      const patient = patients.find(p => p._id === selectedPatient);
      
      const payload = {
        environment: sessionConfig.environment,
        freeText: isPictureRoomTemplate
          ? filterPictureRoomDescription(sessionConfig.sceneDescription)
          : isWordRoomTemplate
          ? filterWordRoomDescription(sessionConfig.sceneDescription)
          : sessionConfig.sceneDescription,
        intensity: sessionConfig.intensity,
        presentationMode: sessionConfig.presentationMode,
        // Include patient information
        patientId: selectedPatient,
        patientName: patient?.name,
        phobia: sessionConfig.phobia || patient?.phobia
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
  const isWordRoomTemplate = sessionConfig.sceneTemplate === 'word-room';
  const pictureRoomPrompts = isPictureRoomTemplate
    ? getPictureRoomPrompts(sessionConfig.sceneDescription)
    : [];
  const wordRoomPrompts = isWordRoomTemplate
    ? getWordRoomPrompts(sessionConfig.sceneDescription)
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
        {/* Left Panel: Patient Selection & Scene Template */}
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

          {/* {selectedPatientData && (
            <div className="card bg-primary-50 border border-primary-100">
              <p className="text-sm text-primary-700">
                <span className="font-semibold">Registered phobia:</span> {selectedPatientData.phobia}
              </p>
              <p className="text-xs text-primary-600 mt-1">
                Phobia is preset from patient registration and cannot be changed here.
              </p>
            </div>
          )} */}

          {patientSessionHistory.length > 0 && (
            <div className="card border border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Previous session intensity log</h2>
                  <p className="text-sm text-gray-500">
                    Latest session used {patientSessionHistory[0].intensity}/5
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
                      <p className="font-medium text-gray-900">Intensity {session.intensity}/5</p>
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

          {/* Scene Template Selection */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Scene Template
            </h2>
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
        </div>

        {/* Right Panel: Intensity, Description & Send to Unity Button */}
        <div className="space-y-6">
          {/* Intensity Slider */}
          {!isPictureRoomTemplate && !isWordRoomTemplate && (
          <div className="card rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">Intensity Level</p>
                <p className="text-xs text-gray-500 mt-1">
                  Start from the last recorded setting and adjust if needed.
                </p>
              </div>
              <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${
                sessionConfig.intensity <= 2 ? 'bg-green-100 text-green-700' :
                sessionConfig.intensity === 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
              }`}>
                {sessionConfig.intensity}/5 ({sessionConfig.intensity <= 2 ? 'Low' : sessionConfig.intensity === 3 ? 'Medium' : 'High'})
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="5"
              value={sessionConfig.intensity}
              onChange={(e) => handleConfigChange('intensity', parseInt(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
            />

            <div className="mt-2 flex justify-between text-xs font-medium text-gray-400">
              <span>1 - Minimal</span>
              <span>3 - Moderate</span>
              <span>5 - Maximum</span>
            </div>
          </div>
          )}

          {/* Scene Description */}
          <div className="card rounded-xl border border-gray-200 bg-white">
            <div className="p-4 pb-2">
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
                  {!isPictureRoomTemplate && !isWordRoomTemplate && (
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
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {pictureRoomPrompts.map((prompt, index) => (
                      <div key={`picture-prompt-${index + 1}`}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="block text-xs font-semibold text-gray-600">
                            Picture {index + 1} prompt
                          </label>
                          <div className="flex items-center gap-1">
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
                            {pictureRoomPrompts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemovePictureRoomPrompt(index)}
                                aria-label={`Remove picture ${index + 1} prompt`}
                                title="Remove picture"
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-xs font-medium transition"
                              >
                                <FiX className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
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
                  <button
                    type="button"
                    onClick={handleAddPictureRoomPrompt}
                    className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary-300 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:border-primary-400 hover:bg-primary-100 transition"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add Picture
                  </button>
                </div>
              ) : isWordRoomTemplate ? (
                <div className="space-y-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <label className="block text-sm font-medium text-gray-700">Presentation Mode</label>
                      <select
                        value={sessionConfig.presentationMode}
                        onChange={(e) => handleConfigChange('presentationMode', e.target.value)}
                        className="form-select text-sm"
                      >
                        <option value="text only">Text only</option>
                        <option value="audio only">Audio only</option>
                        <option value="audio + text">Audio + text</option>
                      </select>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowWordSuggestions(prev => !prev)}
                        className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                      >
                        Suggestions
                      </button>
                    </div>
                  </div>
                  {showWordSuggestions && (
                    <div className="mb-3 w-full max-w-md rounded-lg border border-gray-200 bg-white p-3 shadow">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900">Word room suggestions</p>
                        <button
                          type="button"
                          onClick={() => setShowWordSuggestions(false)}
                          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          aria-label="Close suggestions"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {(SCENE_DESCRIPTION_SUGGESTIONS['word-room'] || []).map((suggestion, index) => (
                          <button
                            key={`word-suggestion-${index}`}
                            type="button"
                            onClick={() => {
                              handleConfigChange('sceneDescription', suggestion);
                              setShowWordSuggestions(false);
                            }}
                            className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-left text-xs leading-5 text-gray-700 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-800"
                          >
                            <pre className="whitespace-pre-wrap text-xs">{suggestion}</pre>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {wordRoomPrompts.map((prompt, index) => (
                      <div key={`word-prompt-${index + 1}`}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <label className="block text-xs font-semibold text-gray-600">
                            Word {index + 1} prompt
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleSceneDescriptionRecordingToggle(index)}
                              disabled={
                                isTranscribingDescription ||
                                (isRecordingDescription && recordingPromptIndex !== index)
                              }
                              aria-label={
                                recordingPromptIndex === index
                                  ? `Stop recording word ${index + 1} prompt`
                                  : `Record word ${index + 1} prompt with microphone`
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
                            {wordRoomPrompts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveWordRoomPrompt(index)}
                                aria-label={`Remove word ${index + 1} prompt`}
                                title="Remove word"
                                className="inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-700 hover:border-red-200 hover:bg-red-50 hover:text-red-700 text-xs font-medium transition"
                              >
                                <FiX className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <textarea
                          value={prompt}
                          onChange={(e) => handleWordRoomPromptChange(index, e.target.value)}
                          placeholder={`Enter word ${index + 1}...`}
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
                  <button
                    type="button"
                    onClick={handleAddWordRoomPrompt}
                    className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary-300 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 hover:border-primary-400 hover:bg-primary-100 transition"
                  >
                    <FiPlus className="h-4 w-4" />
                    Add Word
                  </button>
                </div>
              ) : (
              <textarea
                value={sessionConfig.sceneDescription}
                onChange={(e) => handleConfigChange('sceneDescription', e.target.value)}
                placeholder="Describe the scene in detail for this patient and session intensity...\n\nExamples:\n• Start near the entrance with clear exits visible\n• Keep initial trigger distance moderate, then gradually reduce\n• Maintain calm ambient sounds and neutral lighting"
                className="form-textarea w-full h-32 text-sm"
              />
              )}
              <div className="mt-2 min-h-5 text-xs font-medium">
                {!isPictureRoomTemplate && !isWordRoomTemplate && isRecordingDescription && (
                  <span className="text-red-600">Recording...</span>
                )}
                {!isPictureRoomTemplate && !isWordRoomTemplate && isTranscribingDescription && (
                  <span className="text-primary-700">Processing audio...</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {isPictureRoomTemplate
                  ? 'Fill the picture prompts you want included. These prompts are included in the environment payload sent to Unity.'
                  : isWordRoomTemplate
                  ? 'Fill the word prompts you want included. These prompts are included in the environment payload sent to Unity.'
                  : 'This description guides AI scene generation while keeping the selected template.'}
              </p>
            </div>
          </div>

          {/* Send to Unity Button */}
          <button
            onClick={handleSendToUnity}
            disabled={!selectedPatient || isSendingToUnity}
            className="btn-primary w-full py-3 flex items-center justify-center space-x-2 text-lg font-semibold"
          >
            <FiPlay className="w-5 h-5" />
            <span>{isSendingToUnity ? 'Sending to Unity...' : 'Send to Unity'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SceneBuilder;
