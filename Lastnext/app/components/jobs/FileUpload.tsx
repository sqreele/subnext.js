import React, { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Alert, AlertDescription } from "@/app/components/ui/alert";

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number;
  error?: string | undefined;
  touched?: boolean | undefined;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  maxFiles = 5,
  maxSize = 5,
  error,
  touched,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState<{ [key: string]: number }>(
    {}
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): string | null => {
      if (files.length + selectedFiles.length > maxFiles) {
        return `Maximum ${maxFiles} files allowed`;
      }

      const invalidFiles = files.filter((file) => !file.type.startsWith("image/"));
      if (invalidFiles.length > 0) {
        return "Only image files are allowed";
      }

      const oversizedFiles = files.filter(
        (file) => file.size > maxSize * 1024 * 1024
      );
      if (oversizedFiles.length > 0) {
        return `Files must be smaller than ${maxSize}MB`;
      }

      return null;
    },
    [maxFiles, maxSize, selectedFiles.length]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      const error = validateFiles(files);
      setValidationError(error);

      if (!error) {
        const newFiles = [...selectedFiles, ...files];
        setSelectedFiles(newFiles);
        onFileSelect(newFiles);

        // Initialize progress for new files
        const newProgress = { ...fileProgress };
        files.forEach((file) => {
          newProgress[file.name] = 0;
        });
        setFileProgress(newProgress);

        // Simulate progress
        files.forEach((file) => {
          let progress = 0;
          const interval = setInterval(() => {
            if (progress >= 100) {
              clearInterval(interval);
              return;
            }
            progress += 5;
            setFileProgress((prev) => ({
              ...prev,
              [file.name]: progress,
            }));
          }, 100);
        });
      } else {
        onFileSelect(selectedFiles); // Keep existing files if validation fails
      }
    },
    [selectedFiles, fileProgress, onFileSelect, validateFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      handleFiles(files);
      e.target.value = ""; // Reset input
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      setSelectedFiles((prev) => {
        const newFiles = prev.filter((_, i) => i !== index);
        onFileSelect(newFiles);
        return newFiles;
      });
      setValidationError(null); // Clear validation error when removing files
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [handleFiles]
  );

  const getFilePreview = useCallback((file: File) => {
    try {
      return URL.createObjectURL(file);
    } catch (error) {
      console.error("Error creating preview:", error);
      return "";
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup object URLs on unmount
      selectedFiles.forEach((file) => {
        try {
          const url = getFilePreview(file);
          if (url) URL.revokeObjectURL(url);
        } catch (error) {
          console.error("Error cleaning up:", error);
        }
      });
    };
  }, [selectedFiles, getFilePreview]);

  return (
    <div className="space-y-4">
      {(error || validationError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || validationError}</AlertDescription>
        </Alert>
      )}

      <div
        className={`flex items-center justify-center w-full ${
          isDragging ? "border-primary" : "border-dashed"
        } ${(touched && error) || validationError ? "border-red-500" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
      >
        <label
          className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
            isDragging ? "bg-gray-100 border-primary" : "bg-gray-50 hover:bg-gray-100"
          } ${(touched && error) || validationError ? "border-red-500" : ""}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 text-gray-500" />
            <p className="text-sm text-gray-500">Click or drag images here</p>
            <p className="mt-1 text-xs text-gray-500">
              Max {maxFiles} files, up to {maxSize}MB each
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="relative flex items-center gap-4 p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors duration-200"
            >
              <div className="relative w-16 h-16">
                <Image
                  src={getFilePreview(file)}
                  alt={`Preview ${index}`}
                  fill
                  className="object-cover rounded"
                  sizes="64px"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / (1024 * 1024)).toFixed(2)}MB
                </p>
                <Progress
                  value={fileProgress[file.name] || 0}
                  className="h-1 mt-2"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                onClick={() => removeFile(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
