import React, { useState, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, Square } from 'lucide-react';
import { toast } from 'sonner';

export default function VoiceCommand() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const submitVoiceCommand = trpc.voice.submitVoiceCommand.useMutation();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch (error) {
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);

      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(blob);

      submitVoiceCommand.mutate({
        audioUrl,
        projectId: undefined,
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 p-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Voice Command Entry</h1>
        <p className="text-gray-600">Record voice commands to create accounting entries</p>
      </div>

      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="w-5 h-5" />
            Record Command
          </CardTitle>
          <CardDescription>Speak clearly to record your command</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className={`text-6xl font-mono font-bold ${
              isRecording ? 'text-red-600 animate-pulse' : 'text-gray-600'
            }`}>
              {formatTime(recordingTime)}
            </div>
            <div className="text-sm text-gray-600">
              {isRecording ? 'Recording in progress...' : 'Click record to start'}
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            {!isRecording ? (
              <Button
                size="lg"
                onClick={startRecording}
                className="gap-2"
                variant="default"
              >
                <Mic className="w-5 h-5" />
                Start Recording
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={stopRecording}
                disabled={submitVoiceCommand.isPending}
                className="gap-2"
                variant="destructive"
              >
                {submitVoiceCommand.isPending && <Loader2 className="w-5 h-5 animate-spin" />}
                <Square className="w-5 h-5" />
                Stop Recording
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">Tips for Better Recognition</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>Speak clearly and at a normal pace</li>
            <li>Include project ID or name when creating transactions</li>
            <li>Specify the amount and currency (SAR, USD, AED)</li>
            <li>Mention the material or expense category</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
