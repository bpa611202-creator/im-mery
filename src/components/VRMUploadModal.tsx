import React, { useRef, useState } from 'react';
import { Upload, X, Check, RefreshCw, Box, Trash2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { CustomVRMMetadata } from '../utils/vrmStorage';

export interface VRMUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadVRM: (file: File) => Promise<void>;
  onResetToDefault: () => Promise<void>;
  isLoading: boolean;
  loadProgress: number;
  currentMeta: CustomVRMMetadata | null;
  usingCustomVRM: boolean;
  onToggleModel: (useCustom: boolean) => void;
  errorMessage?: string | null;
}

export const VRMUploadModal: React.FC<VRMUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadVRM,
  onResetToDefault,
  isLoading,
  loadProgress,
  currentMeta,
  usingCustomVRM,
  onToggleModel,
  errorMessage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    setLocalError(null);
    if (!file.name.toLowerCase().endsWith('.vrm') && !file.name.toLowerCase().endsWith('.glb')) {
      setLocalError('Please upload a valid .vrm 3D avatar file.');
      return;
    }

    try {
      await onUploadVRM(file);
    } catch (err: any) {
      setLocalError(err?.message || 'Failed to load VRM model. Please try another file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#141013] border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#F5B2C3]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#F5B2C3]/15 border border-[#F5B2C3]/30 text-[#F5B2C3]">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-wide flex items-center gap-2">
                VRM 3D Model Upload
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5B2C3]/20 text-[#F5B2C3] font-mono border border-[#F5B2C3]/30">
                  v0.x & v1.0
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Upload your custom .vrm anime 3D model for MERY
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Notification */}
        {(errorMessage || localError) && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Upload Error</p>
              <p className="text-red-300/90 text-[11px] mt-0.5">{errorMessage || localError}</p>
            </div>
          </div>
        )}

        {/* Active Model Status Card */}
        <div className="mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00ff66]/20 to-[#00ff66]/5 border border-[#00ff66]/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-[#00ff66]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white truncate">
                  {usingCustomVRM && currentMeta ? currentMeta.name : 'Default VRM Avatar'}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase font-mono">
                  Active
                </span>
              </div>
              <p className="text-[11px] text-white/50 truncate mt-0.5">
                {usingCustomVRM && currentMeta
                  ? `Custom VRM (${formatFileSize(currentMeta.size)})${currentMeta.modelAuthor ? ` • By ${currentMeta.modelAuthor}` : ''}`
                  : 'Default Humanoid VRM 1.0 3D Model'}
              </p>
            </div>
          </div>

          {usingCustomVRM && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onResetToDefault}
                className="px-2.5 py-1 text-xs rounded-lg bg-white/10 hover:bg-rose-500/20 text-white/80 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset to default VRM model"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>
          )}
        </div>

        {/* Upload Drag-and-Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#F5B2C3] bg-[#F5B2C3]/10 scale-[1.01]'
              : 'border-white/15 hover:border-[#F5B2C3]/50 bg-white/[0.02] hover:bg-white/[0.04]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".vrm,.glb"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          {isLoading ? (
            <div className="py-4 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-[#F5B2C3] animate-spin" />
              <div>
                <p className="text-sm font-medium text-white">Loading VRM 3D Model...</p>
                <p className="text-xs text-white/50 mt-1">Parsing bones, blend shapes, and textures</p>
              </div>
              {loadProgress > 0 && (
                <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-[#F5B2C3] transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.round(loadProgress))}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 flex flex-col items-center justify-center gap-2.5">
              <div className="w-12 h-12 rounded-full bg-[#F5B2C3]/10 border border-[#F5B2C3]/20 flex items-center justify-center text-[#F5B2C3]">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Click to upload or drag & drop your <span className="text-[#F5B2C3]">.vrm</span> file
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Supports VRoid, Booth, standard VRM 0.x and VRM 1.0 formats
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F5B2C3] bg-[#F5B2C3]/20 hover:bg-[#F5B2C3]/30 px-4 py-2 rounded-xl mt-1 border border-[#F5B2C3]/40 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                Browse .VRM File
              </button>
            </div>
          )}
        </div>

        {/* Feature Capabilities Checklist */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <p className="text-[11px] font-mono text-white/40 uppercase tracking-wider mb-2">
            Automated Features For Uploaded VRM:
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-white/70">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Real-time Audio Lip-Sync</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Autonomous Blinking</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Natural Head Look-Around</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Spring Bone Hair & Cloth Physics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Emotion Blend Shapes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Greeting Wave Animation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
