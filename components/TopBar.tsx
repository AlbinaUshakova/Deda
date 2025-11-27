'use client';

import SettingsPanel from '@/components/SettingsPanel';
import FeedbackPanel from '@/components/FeedbackPanel';

export default function TopBar() {
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // загрузка пользователя
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUser(data.user);
    });

    const clickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const username =
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'User';

  return (
    <>
      <header className="flex items-center justify-between mb-6 px-3">
        <Link href="/" className="text-lg font-semibold">
          Deda
        </Link>

        {/* если НЕ залогинен */}
        {!user && (
          <Link href="/login" className="text-sm hover:text-blue-300">
            Log in
          </Link>
        )}

        {/* если залогинен */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              className="flex items-center gap-2 text-sm hover:text-blue-300"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span className="max-w-[180px] truncate">{username}</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl w-56 py-2 z-50">
                {/* блок с именем и почтой */}
                <div className="px-4 pb-2 border-b border-white/10 text-sm">
                  <div className="font-medium truncate">{username}</div>
                  {user?.email && (
                    <div className="text-xs text-neutral-400 truncate">
                      {user.email}
                    </div>
                  )}
                </div>

                {/* Настройки */}
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-neutral-100 hover:bg-slate-700"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowSettings(true);
                  }}
                >
                  Настройки
                </button>

                {/* Помощь и обратная связь */}
                <button
                  className="block w-full text-left px-4 py-2 text-sm text-neutral-100 hover:bg-slate-700"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowFeedback(true);
                  }}
                >
                  Помощь и обратная связь
                </button>

                {/* Выйти */}
                <button
                  onClick={logout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-slate-700"
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* панель настроек поверх текущей страницы */}
      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {showFeedback && (
        <FeedbackPanel onClose={() => setShowFeedback(false)} />
      )}
    </>
  );
}
