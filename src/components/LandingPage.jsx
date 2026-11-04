import React, { useState, useEffect } from 'react';
import { 
  ArrowRight
} from 'lucide-react';
import RegistrationForm from './RegistrationForm';

export default function LandingPage({ 
  onRegistrationSuccess, 
  eventSettings,
  onOpenLookup 
}) {
  // Countdown Timer
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Target conference date: Nov 19, 2026 (or parsed from eventSettings)
    const targetDate = new Date('2026-11-19T09:00:00+05:30').getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate - now);

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const scrollToRegister = () => {
    const el = document.getElementById('registration-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      {/* ================= HERO SECTION ================= */}
      <section className="relative w-full pt-8 sm:pt-12 pb-12 sm:pb-16 lg:py-20 px-3 sm:px-6 lg:px-8 overflow-hidden bg-[#1c0812] text-white">
        {/* Conference Official Theme Background Artwork */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none" 
          style={{ backgroundImage: `url('/hero-bg.png')` }}
        />
        {/* Subtle dark overlay to balance vibrancy and high readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-stone-950/80 via-stone-950/60 to-[#1c0812]/95 pointer-events-none" />
        {/* Subtle patterned Islamic dot texture */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fbbf24_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-rose-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto">
          {/* Two-Column Grid: Left Column = Centenary & Conference Details, Right Column = Official Poster & Register Now */}
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
            
            {/* ================= LEFT COLUMN: Samastha Centenary Conference Official Visual ================= */}
            <div className="order-1 w-full flex items-center justify-center lg:justify-start">
              <img 
                src="/samastha-centenary-hero.png" 
                alt="Samastha Centenary Conference" 
                className="w-full max-w-lg lg:max-w-xl h-auto object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] select-none pointer-events-none"
              />
            </div>

            {/* ================= RIGHT COLUMN: Official Poster Card & Actions ================= */}
            <div className="order-2 w-full flex flex-col gap-5 sm:gap-6 justify-center items-center max-w-md mx-auto">
              <div className="w-full bg-white/10 backdrop-blur-xl p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/20 shadow-2xl text-center space-y-3 sm:space-y-4">
                
                {/* Official Conference Poster Image */}
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 aspect-square max-w-[280px] sm:max-w-[340px] mx-auto bg-slate-900 group">
                  <img 
                    src="/muthaallim-poster.png" 
                    alt="മലപ്പുറം ഈസ്റ്റ് ജില്ല മുതഅല്ലിം സമ്മേളനം - 19 നവംബർ 2026 വ്യാഴം, പുളിക്കൽ (ഐക്കരപ്പടി)" 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Register Now Button */}
                <div className="pt-1 sm:pt-2">
                  <button
                    onClick={scrollToRegister}
                    className="w-full py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl font-heading font-extrabold text-base sm:text-xl text-white bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/40 transform hover:-translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                  >
                    <span>Register Now</span>
                    <ArrowRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                {/* Retrieve Pass Quick Link */}
                <div className="text-center pt-0.5">
                  <button
                    onClick={onOpenLookup}
                    className="text-xs font-semibold text-slate-300 hover:text-amber-300 underline underline-offset-4 transition cursor-pointer"
                  >
                    Already registered? Find your ticket pass
                  </button>
                </div>
              </div>

              {/* Countdown Timer */}
              <div className="w-full grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                <div className="bg-slate-900/80 backdrop-blur-md p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-white/10 shadow-sm">
                  <span className="text-lg sm:text-2xl font-heading font-black text-amber-300 block">{timeLeft.days}</span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-semibold">Days</span>
                </div>
                <div className="bg-slate-900/80 backdrop-blur-md p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-white/10 shadow-sm">
                  <span className="text-lg sm:text-2xl font-heading font-black text-emerald-300 block">{timeLeft.hours}</span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-semibold">Hours</span>
                </div>
                <div className="bg-slate-900/80 backdrop-blur-md p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-white/10 shadow-sm">
                  <span className="text-lg sm:text-2xl font-heading font-black text-emerald-300 block">{timeLeft.minutes}</span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-semibold">Mins</span>
                </div>
                <div className="bg-slate-900/80 backdrop-blur-md p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border border-white/10 shadow-sm">
                  <span className="text-lg sm:text-2xl font-heading font-black text-emerald-300 block">{timeLeft.seconds}</span>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-semibold">Secs</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= REGISTRATION SECTION ================= */}
      <section id="registration-section" className="py-8 sm:py-12 bg-slate-100/70 border-y border-slate-200/80">
        <RegistrationForm
          onRegistrationSuccess={onRegistrationSuccess}
          eventSettings={eventSettings}
          onFindExistingTicket={onOpenLookup}
        />
      </section>
    </div>
  );
}
