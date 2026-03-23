import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VoiceRecorderProps {
    onSend: (blob: Blob) => void;
    disabled?: boolean;
}

export function VoiceRecorder({ onSend, disabled = false }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // Formatear tiempo a MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Iniciar grabación
    const startRecording = useCallback(async () => {
        try {
            // Método 1: Modern getUserMedia con fallbacks
            let stream: MediaStream;
            
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                // Navegadores modernos
                try {
                    // Intentar con opciones completas primero
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            autoGainControl: true,
                            sampleRate: 48000,
                            channelCount: 1
                        } 
                    });
                } catch (constraintError) {
                    console.log('Constraints completas fallaron, intentando básicas...', constraintError);
                    // Fallback a opciones básicas
                    stream = await navigator.mediaDevices.getUserMedia({ 
                        audio: true 
                    });
                }
            } else if ((navigator as any).webkitGetUserMedia) {
                // Safari y navegadores antiguos con prefijo
                console.log('Usando webkitGetUserMedia (Safari/navegadores antiguos)');
                stream = await new Promise((resolve, reject) => {
                    (navigator as any).webkitGetUserMedia(
                        { audio: true },
                        resolve,
                        reject
                    );
                });
            } else if ((navigator as any).mozGetUserMedia) {
                // Firefox antiguo
                console.log('Usando mozGetUserMedia (Firefox antiguo)');
                stream = await new Promise((resolve, reject) => {
                    (navigator as any).mozGetUserMedia(
                        { audio: true },
                        resolve,
                        reject
                    );
                });
            } else {
                throw new Error('Tu navegador no soporta grabación de audio. Por favor usa Chrome, Firefox, Edge o Safari versión 11+.');
            }
            
            streamRef.current = stream;
            
            // Método 2: MediaRecorder con OPUS obligatorio para voice notes
            let mediaRecorder: MediaRecorder;
            let mimeType: string | undefined;
            let isVoiceNoteCompatible = false;
            
            // PRIORIDAD 1: OGG con OPUS (formato WhatsApp voice notes)
            if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
                mimeType = 'audio/ogg;codecs=opus';
                isVoiceNoteCompatible = true;
                console.log('✅ Usando OGG con OPUS (WhatsApp voice notes)');
            } 
            // PRIORIDAD 2: WebM con OPUS (convertible a OGG)
            else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
                mimeType = 'audio/webm;codecs=opus';
                isVoiceNoteCompatible = true;
                console.log('⚠️ Usando WebM con OPUS (se convertirá a OGG)');
            }
            // PRIORIDAD 3: OGG básico (puede no tener OPUS)
            else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/ogg')) {
                mimeType = 'audio/ogg';
                isVoiceNoteCompatible = false; // No garantizado OPUS
                console.log('⚠️ Usando OGG básico (OPUS no garantizado)');
            }
            // PRIORIDAD 4: Formatos alternativos (no para voice notes)
            else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm')) {
                mimeType = 'audio/webm';
                isVoiceNoteCompatible = false;
                console.log('❌ Usando WebM (no compatible con voice notes)');
            } else if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/mp4')) {
                mimeType = 'audio/mp4';
                isVoiceNoteCompatible = false;
                console.log('❌ Usando MP4 (no compatible con voice notes)');
            } else {
                // Safari y navegadores antiguos
                console.log('❌ Usando formato por defecto (no compatible con voice notes)');
                mimeType = undefined;
                isVoiceNoteCompatible = false;
            }
            
            try {
                if (mimeType) {
                    mediaRecorder = new MediaRecorder(stream, { mimeType });
                } else {
                    mediaRecorder = new MediaRecorder(stream);
                }
            } catch (formatError) {
                console.log('❌ Error con formato específico, usando MediaRecorder básico:', formatError);
                mediaRecorder = new MediaRecorder(stream);
                isVoiceNoteCompatible = false;
            }
            
            // Guardar información del formato para validación
            (mediaRecorder as any).isVoiceNoteCompatible = isVoiceNoteCompatible;
            (mediaRecorder as any).detectedMimeType = mimeType;
            
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                // Crear blob con el formato detectado
                const detectedMimeType = mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type: detectedMimeType });
                const url = URL.createObjectURL(blob);
                setAudioURL(url);
                setDuration(0);
                
                // Guardar información del formato para validación y conversión
                (blob as any).isVoiceNoteCompatible = isVoiceNoteCompatible;
                (blob as any).detectedMimeType = detectedMimeType;
                
                console.log('🎵 Grabación completada:', {
                    mimeType: detectedMimeType,
                    isVoiceNoteCompatible: isVoiceNoteCompatible,
                    blobSize: blob.size,
                    duration: duration,
                    whatsappCompatible: isVoiceNoteCompatible ? '✅ Sí' : '❌ No'
                });
            };
            
            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);
            
            // Iniciar timer
            const startTime = Date.now();
            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                setDuration(elapsed);
            }, 100);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            
            let errorMessage = 'No se pudo acceder al micrófono. ';
            
            if (error instanceof Error) {
                if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                    errorMessage += 'Por favor permite el acceso al micrófono en tu navegador.\n\n' +
                        '📋 Pasos para solucionarlo:\n' +
                        '1. Haz click en el ícono de 🔒 o 📷 en la barra de direcciones\n' +
                        '2. Selecciona "Permitir" para el micrófono\n' +
                        '3. Recarga la página y vuelve a intentar\n\n' +
                        'Si ya diste permisos, verifica que ningún otro programa esté usando el micrófono.';
                } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
                    errorMessage += 'No se encontró ningún micrófono conectado.\n\n' +
                        '💡 Asegúrate de tener:\n' +
                        '• Un micrófono conectado\n' +
                        '• Los drivers actualizados\n' +
                        '• Que no esté desactivado en configuración del sistema';
                } else if (error.name === 'NotSupportedError' || error.name === 'ConstraintNotSatisfiedError') {
                    errorMessage += 'Tu dispositivo no soporta las características de audio necesarias.\n\n' +
                        '💡 Intenta:\n' +
                        '• Usar otro navegador (Chrome, Firefox, Edge)\n' +
                        '• Verificar que tu micrófono funcione en otras aplicaciones';
                } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
                    errorMessage += 'El micrófono está siendo usado por otra aplicación.\n\n' +
                        '💡 Intenta:\n' +
                        '• Cerrar otras apps que usen el micrófono\n' +
                        '• Recargar la página\n' +
                        '• Reiniciar el navegador';
                } else {
                    errorMessage += `Error: ${error.message}\n\n` +
                        '💡 Si el problema persiste:\n' +
                        '• Recarga la página\n' +
                        '• Limpia el cache del navegador\n' +
                        '• Intenta con otro navegador';
                }
            } else {
                errorMessage += 'Error desconocido al acceder al micrófono.\n\n' +
                    '💡 Intenta recargar la página y permitir los permisos cuando se te soliciten.';
            }
            
            alert(errorMessage);
        }
    }, []);

    // Pausar grabación
    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, []);

    // Reanudar grabación
    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            
            // Reanudar timer
            const startTime = Date.now() - (duration * 1000);
            timerRef.current = setInterval(() => {
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                setDuration(elapsed);
            }, 100);
        }
    }, [duration]);

    // Detener grabación
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        }
    }, []);

    // Cancelar grabación
    const cancelRecording = useCallback(() => {
        stopRecording();
        setAudioURL(null);
        setDuration(0);
    }, [stopRecording]);

    // Enviar grabación
    const sendRecording = useCallback(() => {
        if (audioURL) {
            fetch(audioURL)
                .then(res => res.blob())
                .then(blob => {
                    onSend(blob);
                    cancelRecording();
                })
                .catch(error => {
                    console.error('Error sending recording:', error);
                    alert('Error al enviar la grabación');
                });
        }
    }, [audioURL, onSend, cancelRecording]);

    // Reproducir/Pausar preview
    const togglePlayback = useCallback(() => {
        if (!audioRef.current) return;
        
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    }, [isPlaying]);

    // Actualizar progreso de reproducción
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => {
            if (audio.duration) {
                // Aquí podrías agregar una barra de progreso si quieres
            }
            if (audio.ended) {
                setIsPlaying(false);
            }
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('ended', () => setIsPlaying(false));

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('ended', () => setIsPlaying(false));
        };
    }, [audioURL]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (audioURL) {
                URL.revokeObjectURL(audioURL);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [audioURL]);

    return (
        <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-gray-200">
            {/* Botón de grabación */}
            {!isRecording && !audioURL && (
                <button
                    onClick={startRecording}
                    disabled={disabled}
                    className="w-10 h-10 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-full flex items-center justify-center transition-colors"
                    title="Grabar nota de voz"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                </button>
            )}

            {/* Controles de grabación */}
            {isRecording && (
                <div className="flex items-center gap-3">
                    {/* Indicador de grabación */}
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-red-600">
                            {isPaused ? 'Pausado' : 'Grabando'}
                        </span>
                        <span className="text-sm text-gray-600">
                            {formatTime(duration)}
                        </span>
                    </div>

                    {/* Botones de control */}
                    <div className="flex items-center gap-1">
                        {isPaused ? (
                            <button
                                onClick={resumeRecording}
                                className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Reanudar grabación"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                            </button>
                        ) : (
                            <button
                                onClick={pauseRecording}
                                className="w-8 h-8 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full flex items-center justify-center transition-colors"
                                title="Pausar grabación"
                            >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </button>
                        )}
                        
                        <button
                            onClick={stopRecording}
                            className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                            title="Detener grabación"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* Preview y envío */}
            {audioURL && (
                <div className="flex items-center gap-3">
                    {/* Audio player oculto */}
                    <audio ref={audioRef} src={audioURL} />
                    
                    {/* Controles de preview */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={togglePlayback}
                            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
                            title={isPlaying ? 'Pausar' : 'Escuchar'}
                        >
                            {isPlaying ? (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                        
                        <span className="text-sm text-gray-600">
                            {formatTime(duration)}
                        </span>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={sendRecording}
                            className="w-8 h-8 bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center justify-center transition-colors"
                            title="Enviar nota de voz"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                        
                        <button
                            onClick={cancelRecording}
                            className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors"
                            title="Cancelar"
                        >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
