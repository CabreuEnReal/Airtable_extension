import { useState, useRef } from 'react';
import { validateFile } from '../../utils/fileUtils';

interface FileUploadButtonProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
    accept?: string;
}

export function FileUploadButton({ 
    onFileSelect, 
    disabled = false, 
    accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,video/mp4,audio/*"
}: FileUploadButtonProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        const validation = validateFile(file);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }
        onFileSelect(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
        // Reset input value to allow selecting the same file again
        e.target.value = '';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleClick = () => {
        if (!disabled && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="relative">
            <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
            />
            
            <button
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={disabled}
                className={`p-2 rounded-lg transition-colors ${
                    disabled 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : isDragging
                            ? 'bg-primary text-white'
                            : 'text-gray-500 hover:text-primary hover:bg-gray-100'
                }`}
                title="Adjuntar archivo (arrastra o haz clic)"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
            </button>
        </div>
    );
}
