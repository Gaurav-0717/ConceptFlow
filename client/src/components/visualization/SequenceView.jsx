import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, Server, Laptop, CheckCircle, Info, ChevronRight } from "lucide-react";

/**
 * SequenceView
 * Renders a sequence message exchange diagram (e.g. TCP Three-Way Handshake).
 * Makes sender/receiver relationships obvious with participant lifelines,
 * directional message arrows, protocol flags, and step-by-step interactive playback.
 */
const SequenceView = ({ concept }) => {
  const connections = concept?.connections || [];
  const participants = concept?.participants || [
    { id: "client", label: "Client Host", role: "Initiator" },
    { id: "server", label: "Server Host", role: "Receiver" }
  ];

  const [activeStep, setActiveStep] = useState(connections.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState(0);

  // Auto-step player
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= connections.length) {
            return 1;
          }
          return prev + 1;
        });
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, connections.length]);

  const handleReset = () => {
    setIsPlaying(false);
    setActiveStep(1);
    setSelectedMessageIndex(0);
  };

  const handleStepForward = () => {
    if (activeStep < connections.length) {
      setActiveStep((prev) => prev + 1);
      setSelectedMessageIndex(activeStep);
    } else {
      setActiveStep(1);
      setSelectedMessageIndex(0);
    }
  };

  const selectedMessage = connections[selectedMessageIndex] || connections[0];

  return (
    <div className="space-y-6">
      {/* Sequence Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              isPlaying
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? "Pause Playback" : "Animate Handshake"}</span>
          </button>

          <button
            onClick={handleStepForward}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>Next Step</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors"
            title="Reset Sequence"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">
            Visible Exchanges: {Math.min(activeStep, connections.length)} of {connections.length}
          </span>
          <span className="text-slate-400">|</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
            {activeStep >= connections.length ? "Connection Established" : "Synchronizing..."}
          </span>
        </div>
      </div>

      {/* Main Sequence Canvas */}
      <div className="relative p-6 sm:p-10 rounded-2xl bg-white border border-slate-200 shadow-xs overflow-x-auto min-h-[460px]">
        <div className="max-w-3xl mx-auto">
          {/* Participant Headers */}
          <div className="grid grid-cols-2 gap-8 sm:gap-16 mb-8">
            {participants.map((p, idx) => (
              <div
                key={p.id}
                className="flex flex-col items-center p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/50 shadow-xs text-center"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mb-2 shadow-xs">
                  {idx === 0 ? <Laptop className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                </div>
                <h4 className="text-sm font-bold text-slate-900">{p.label}</h4>
                <span className="text-[11px] font-semibold text-indigo-700">{p.role || "Host"}</span>
              </div>
            ))}
          </div>

          {/* Lifelines and Exchange Arrows Container */}
          <div className="relative py-4">
            {/* Vertical Lifelines */}
            <div className="absolute top-0 bottom-0 left-[25%] -translate-x-1/2 w-0.5 border-l-2 border-dashed border-slate-300 pointer-events-none" />
            <div className="absolute top-0 bottom-0 left-[75%] -translate-x-1/2 w-0.5 border-l-2 border-dashed border-slate-300 pointer-events-none" />

            {/* Sequence Message Rows */}
            <div className="space-y-12">
              {connections.map((msg, index) => {
                const stepNum = index + 1;
                const isVisible = stepNum <= activeStep;
                const isSelected = selectedMessageIndex === index;
                const isLeftToRight = msg.from === participants[0]?.id || msg.from?.toLowerCase().includes("client");

                return (
                  <div
                    key={index}
                    onClick={() => {
                      setSelectedMessageIndex(index);
                      if (stepNum > activeStep) setActiveStep(stepNum);
                    }}
                    className={`relative cursor-pointer transition-all ${
                      isVisible ? "opacity-100" : "opacity-25"
                    }`}
                  >
                    {/* Step Number Tag on Left Margin */}
                    <div className="flex items-center justify-between px-2 mb-1 text-[11px] font-mono text-slate-400">
                      <span>Step {stepNum}</span>
                      {msg.status && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          State: {msg.status}
                        </span>
                      )}
                    </div>

                    {/* Lifeline Crossing Arrow */}
                    <div className="relative h-12 flex items-center px-[25%]">
                      {/* Connection Line */}
                      <div
                        className={`w-full h-1 rounded-full transition-all relative ${
                          isSelected
                            ? "bg-indigo-600 shadow-sm"
                            : isVisible
                            ? "bg-indigo-400"
                            : "bg-slate-200"
                        }`}
                      >
                        {/* Animated traveling packet pulse if active */}
                        {isVisible && isPlaying && (
                          <div
                            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-600 shadow-md animate-ping ${
                              isLeftToRight ? "right-2" : "left-2"
                            }`}
                          />
                        )}

                        {/* Arrowhead */}
                        {isLeftToRight ? (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 w-0 h-0 border-y-[6px] border-y-transparent border-l-[10px] border-l-indigo-600" />
                        ) : (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-0 h-0 border-y-[6px] border-y-transparent border-r-[10px] border-r-indigo-600" />
                        )}

                        {/* Message Label Pill centered on arrow */}
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-xs border transition-all ${
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-500/20"
                                : "bg-white text-slate-800 border-slate-300 hover:border-indigo-400"
                            }`}
                          >
                            <span className="mr-1">{isLeftToRight ? "→" : "←"}</span>
                            <span>{msg.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sender -> Receiver Label */}
                    <div className="flex justify-between text-[11px] text-slate-400 px-[22%] pt-1">
                      <span>Sender: <strong className="text-slate-600">{msg.from}</strong></span>
                      <span>Receiver: <strong className="text-slate-600">{msg.to}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Handshake Conclusion Badge */}
          {activeStep >= connections.length && (
            <div className="mt-8 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                <span className="font-semibold">
                  Three-Way Handshake Completed: Sockets bound, sequence numbers synchronized.
                </span>
              </div>
              <span className="font-mono text-emerald-700 uppercase font-bold">ESTABLISHED</span>
            </div>
          )}
        </div>
      </div>

      {/* Message Inspection Card */}
      {selectedMessage && (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Info className="w-4 h-4" />
              </span>
              <h4 className="text-sm font-bold text-slate-900">
                Packet Transmission: {selectedMessage.label}
              </h4>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">
              {selectedMessage.from} ➔ {selectedMessage.to}
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            {selectedMessage.description || "Segment exchanged during connection establishment."}
          </p>

          <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 flex items-center justify-between">
            <span>Transmission Direction: <strong>{selectedMessage.from}</strong> to <strong>{selectedMessage.to}</strong></span>
            {selectedMessage.status && (
              <span>Resulting Socket State: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px]">{selectedMessage.status}</code></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SequenceView;
