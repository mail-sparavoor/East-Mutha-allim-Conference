import React, { useState, useEffect } from 'react';
import { 
  ArrowRight,
  QrCode
} from 'lucide-react';
import RegistrationForm from './RegistrationForm';

// Samastha Centenary (100 Years) Logo Component matching Image 1
function CentenaryLogo() {
  return (
    <div className="flex items-center gap-3.5 sm:gap-4 my-2 select-none">
      <svg className="h-14 sm:h-16 w-32 sm:w-36 object-contain flex-shrink-0" viewBox="0 0 150 70" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Number 1 */}
        <path d="M14 16 L26 10 L26 60 M12 60 L40 60" stroke="#ffffff" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* First Circle 0 */}
        <circle cx="64" cy="35" r="23" stroke="#ffffff" strokeWidth="5.5" />
        {/* Second Interlocking Circle 0 */}
        <circle cx="100" cy="35" r="23" stroke="#ffffff" strokeWidth="5.5" />
      </svg>
      <div className="h-12 sm:h-14 w-[1.5px] bg-white/30" />
      <div className="text-left font-heading leading-tight">
        <span className="block text-xs sm:text-sm font-semibold text-white tracking-wide">One</span>
        <span className="block text-xs sm:text-sm font-semibold text-white tracking-wide">Hundred</span>
        <span className="block text-xs sm:text-sm font-bold text-amber-400 tracking-wide">Years <span className="font-normal text-white/80">of</span></span>
        <span className="block text-xs sm:text-sm font-semibold text-white tracking-wide">Commitment</span>
      </div>
    </div>
  );
}

export default function LandingPage({ 
  onRegistrationSuccess, 
  eventSettings,
  onOpenLookup,
  onOpenCheckIn 
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
            
            {/* ================= LEFT COLUMN (DESKTOP) / FIRST ON MOBILE (order-1) ================= */}
            <div className="order-1 w-full flex flex-col gap-5 sm:gap-6 justify-center">
              {/* Vertical accent line & Centenary Headline */}
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <div className="w-0.5 h-10 sm:h-12 bg-amber-400/90" />
                  <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-white shadow-md shadow-white/80 -mt-0.5" />
                </div>
                <div className="font-heading font-black tracking-tight text-xl sm:text-3xl md:text-4xl text-white uppercase leading-snug drop-shadow-md">
                  A <span className="text-amber-400 font-black">CENTURY</span><br />
                  THAT <span className="text-amber-400 font-black">SHAPED</span><br />
                  GENERATIONS
                </div>
              </div>

              {/* Centenary 100 Logo Emblem */}
              <CentenaryLogo />

              {/* Samastha 100-Year Narrative */}
              <p className="text-xs sm:text-base text-slate-200 leading-relaxed max-w-xl">
                Founded in 1926, <strong className="text-amber-300 font-bold">Samastha Kerala Jam'iyyathul Ulama</strong> celebrates 100 years of transforming lives and enriching society through knowledge, service and inclusive growth.
              </p>

              {/* Mutha'allim Sammelanam Conference Details */}
              <div className="p-3.5 sm:p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 max-w-xl space-y-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />
                  <span className="font-heading font-extrabold text-xs sm:text-sm uppercase tracking-wider text-amber-300">
                    മലപ്പുറം ഈസ്റ്റ് &bull; മുതഅല്ലിം സമ്മേളനം 2026
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  മലപ്പുറം ഈസ്റ്റ് ജില്ലാ മുതഅല്ലിം സമ്മേളനം! അറിവിന്റെയും പാരമ്പര്യത്തിന്റെയും വിജ്ഞാന സൗഹൃദത്തിന്റെയും സംഗമം. ആയിരക്കണക്കിന് മുതഅല്ലിംകളും ദർസ് വിദ്യാർത്ഥികളും പണ്ഡിതന്മാരും അണിനിരക്കുന്ന ചരിത്ര സംഗമം — പുളിക്കൽ (ഐക്കരപ്പടി).
                </p>
                <div className="pt-1 flex flex-wrap gap-2 text-[11px] sm:text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                    19 നവംബർ 2026 വ്യാഴം
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    പുളിക്കൽ (ഐക്കരപ്പടി)
                  </span>
                </div>
              </div>
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

                {/* Retrieve Pass Quick Link & Gate Scanner */}
                <div className="text-center pt-1 flex flex-col gap-1.5 items-center">
                  <button
                    onClick={onOpenLookup}
                    className="text-xs font-semibold text-slate-300 hover:text-amber-300 underline underline-offset-4 transition cursor-pointer"
                  >
                    Already registered? Find your ticket pass
                  </button>
                  {onOpenCheckIn && (
                    <button
                      onClick={onOpenCheckIn}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 hover:text-emerald-200 transition cursor-pointer pt-0.5"
                    >
                      <QrCode className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Gate Volunteers: Open Admission Scanner</span>
                    </button>
                  )}
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
