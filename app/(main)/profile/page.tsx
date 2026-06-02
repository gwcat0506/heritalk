export default function ProfilePage() {
  return (
    <div className="px-5 pt-6">
      <h1 className="text-xl font-bold text-stone-900 mb-6">내 정보</h1>
      <div className="space-y-3">
        <div className="p-4 rounded-2xl border border-stone-100 bg-stone-50">
          <p className="text-xs text-stone-400 mb-1">기본 도슨트 난이도</p>
          <p className="text-sm font-medium text-stone-700">일반</p>
        </div>
        <div className="p-4 rounded-2xl border border-stone-100 bg-stone-50">
          <p className="text-xs text-stone-400 mb-1">방문한 유산</p>
          <p className="text-sm font-medium text-stone-700">준비 중</p>
        </div>
        <div className="p-4 rounded-2xl border border-stone-100 bg-stone-50">
          <p className="text-xs text-stone-400 mb-1">즐겨찾기</p>
          <p className="text-sm font-medium text-stone-700">준비 중</p>
        </div>
      </div>
    </div>
  )
}
