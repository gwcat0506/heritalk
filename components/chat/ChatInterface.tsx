'use client'
import { useState, useRef, useEffect } from 'react'
import { useVoice } from '@/hooks/useVoice'
import { ChatMessage, DocentLevel, Heritage } from '@/types/heritage'
import { Mic, MicOff, Volume2, VolumeX, Send } from 'lucide-react'

interface Props {
  heritage: Heritage
}

const LEVEL_LABELS: Record<DocentLevel, string> = {
  child: '어린이',
  general: '일반',
  expert: '심화',
}

export default function ChatInterface({ heritage }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [level, setLevel] = useState<DocentLevel>('general')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { isListening, isSpeaking, startListening, stopListening, speak, stopSpeaking } = useVoice()

  // 유산 변경 시 초기 인사 메시지
  useEffect(() => {
    setMessages([{
      id: 'init',
      role: 'assistant',
      content: `안녕하세요! ${heritage.name} 도슨트입니다. 궁금한 것을 자유롭게 물어보세요.`,
      createdAt: new Date(),
    }])
  }, [heritage.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          heritageId: heritage.id,
          heritageName: heritage.name,
          level,
        }),
      })

      // 스트리밍 처리
      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        createdAt: new Date(),
      }
      setMessages(prev => [...prev, assistantMsg])

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        // SSE 파싱 (claude streaming)
        const lines = chunk.split('\n').filter(l => l.startsWith('data:'))
        for (const line of lines) {
          try {
            const data = JSON.parse(line.slice(5))
            if (data.type === 'content_block_delta') {
              fullText += data.delta?.text ?? ''
              setMessages(prev =>
                prev.map(m => m.id === assistantMsg.id ? { ...m, content: fullText } : m)
              )
            }
          } catch {}
        }
      }

      // TTS로 답변 읽어주기
      if (fullText) speak(fullText)

    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoice = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening((text) => sendMessage(text))
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 헤더 */}
      <div className="px-4 pt-4 pb-3 border-b border-stone-100">
        <h2 className="text-base font-semibold text-stone-900">{heritage.name}</h2>
        {/* 난이도 선택 */}
        <div className="flex gap-2 mt-2">
          {(Object.keys(LEVEL_LABELS) as DocentLevel[]).map(l => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                level === l
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
              }`}
            >
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-xs mr-2 mt-0.5 flex-shrink-0">
                🏛️
              </div>
            )}
            <div
              className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-stone-900 text-white rounded-br-sm'
                  : 'bg-stone-100 text-stone-800 rounded-bl-sm'
              }`}
            >
              {msg.content || <span className="text-stone-400 animate-pulse">답변 생성 중...</span>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="px-4 pb-4 pt-2 border-t border-stone-100">
        <div className="flex items-center gap-2 bg-stone-50 rounded-2xl px-4 py-2.5 border border-stone-200">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder="질문을 입력하거나 마이크를 누르세요"
            className="flex-1 bg-transparent text-sm text-stone-800 placeholder:text-stone-400 outline-none"
          />
          {/* 음성 버튼 */}
          <button
            onClick={handleVoice}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          {/* TTS 토글 */}
          <button
            onClick={isSpeaking ? stopSpeaking : undefined}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isSpeaking ? 'text-amber-500' : 'text-stone-300'
            }`}
          >
            {isSpeaking ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {/* 전송 */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center disabled:opacity-30 hover:bg-stone-700 transition-all"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
