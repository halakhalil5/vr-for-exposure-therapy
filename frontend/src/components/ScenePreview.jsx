/**
 * ScenePreview Component
 * 
 * Displays Unity-generated scene preview with controls for
 * approving, editing, or regenerating the scene.
 */

import { useState } from 'react';
import { 
  FiImage, 
  FiRefreshCw, 
  FiCheck, 
  FiEdit3, 
  FiMaximize2,
  FiSend,
  FiX
} from 'react-icons/fi';

const ScenePreview = ({ 
  previewURL = null, 
  sceneJSON = null,
  isLoading = false,
  isApproved = false,
  onRegenerate,
  onApprove,
  onEdit,
  onSendToUnity
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showJSON, setShowJSON] = useState(false);

  // Render loading state
  if (isLoading) {
    return (
      <div className="card">
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="spinner w-8 h-8 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">Generating scene preview...</p>
            <p className="text-xs text-gray-400 mt-1">This may take a moment</p>
          </div>
        </div>
      </div>
    );
  }

  // Render placeholder when no preview
  if (!previewURL && !sceneJSON) {
    return (
      <div className="card">
        <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center p-6">
            <FiImage className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No Preview Available</p>
            <p className="text-sm text-gray-400 mt-1">
              Configure the scene and click "Generate Scene" to create a preview
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-4">
      {/* Preview Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-gray-900">Scene Preview</h3>
          <p className="text-sm text-gray-500">
            {isApproved ? 'Scene approved and ready' : 'Review the generated scene'}
          </p>
        </div>
        
        {isApproved && (
          <span className="badge-success flex items-center space-x-1">
            <FiCheck className="w-3 h-3" />
            <span>Approved</span>
          </span>
        )}
      </div>

      {/* Preview Image */}
      <div className="relative group">
        {previewURL ? (
          <div className="relative">
            <img
              src={previewURL}
              alt="VR Scene Preview"
              className="w-full aspect-video object-cover rounded-lg bg-gray-100"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            {/* Fallback when image fails to load */}
            <div 
              className="w-full aspect-video bg-gray-100 rounded-lg items-center justify-center hidden"
            >
              <div className="text-center">
                <FiImage className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Preview image unavailable</p>
              </div>
            </div>

            {/* Fullscreen button */}
            <button
              onClick={() => setIsFullscreen(true)}
              className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 
                         rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <FiMaximize2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-primary-100 to-primary-200 
                          rounded-lg flex items-center justify-center">
            <div className="text-center">
              <FiImage className="w-8 h-8 text-primary-400 mx-auto mb-2" />
              <p className="text-sm text-primary-600">Scene configuration ready</p>
              <p className="text-xs text-primary-400 mt-1">
                Send to Unity to generate preview
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scene Configuration Toggle */}
      {sceneJSON && (
        <div>
          <button
            onClick={() => setShowJSON(!showJSON)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {showJSON ? 'Hide' : 'View'} Scene Configuration
          </button>
          
          {showJSON && (
            <div className="mt-3 bg-gray-900 rounded-lg p-4 overflow-auto max-h-60">
              <pre className="text-xs text-gray-300 font-mono">
                {JSON.stringify(sceneJSON, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 pt-2">
        {/* Regenerate */}
        {onRegenerate && (
          <button
            onClick={onRegenerate}
            className="btn-secondary flex items-center space-x-2 text-sm"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>Regenerate</span>
          </button>
        )}

        {/* Edit Scene */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="btn-secondary flex items-center space-x-2 text-sm"
          >
            <FiEdit3 className="w-4 h-4" />
            <span>Edit Scene</span>
          </button>
        )}

        {/* Send to Unity */}
        {onSendToUnity && sceneJSON && (
          <button
            onClick={onSendToUnity}
            className="btn-primary flex items-center space-x-2 text-sm"
          >
            <FiSend className="w-4 h-4" />
            <span>Send to Unity</span>
          </button>
        )}

        {/* Approve */}
        {onApprove && !isApproved && previewURL && (
          <button
            onClick={onApprove}
            className="btn-success flex items-center space-x-2 text-sm"
          >
            <FiCheck className="w-4 h-4" />
            <span>Approve Scene</span>
          </button>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && previewURL && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setIsFullscreen(false)}
        >
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg"
          >
            <FiX className="w-6 h-6 text-white" />
          </button>
          <img
            src={previewURL}
            alt="VR Scene Preview Fullscreen"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ScenePreview;
