import React, { useRef, useState } from 'react';
import { 
  Download, 
  Printer, 
  Share2, 
  Check, 
  Sparkles, 
  ArrowLeft, 
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Authentic Barcode SVG Component
function TicketBarcode({ code = '8 992772 485012', isWhite = false }) {
  const bars = [
    2, 1, 3, 1, 2, 2, 1, 4, 1, 2, 1, 3, 2, 1, 1, 3, 2, 2, 1, 1, 3, 1, 2, 1,
    4, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1, 2, 1, 4, 2, 1, 1, 3, 2, 1, 2, 2, 1, 3
  ];

  return (
    <div className="flex flex-col items-center justify-center">
      <svg className="h-8 w-44 object-contain" viewBox="0 0 176 34">
        <g fill={isWhite ? "#ffffff" : "#111827"}>
          {bars.map((width, idx) => {
            const xPos = idx * 3.6;
            return (
              <rect
                key={idx}
                x={xPos}
                y="0"
                width={width * 0.75}
                height={idx % 7 === 0 ? "32" : "26"}
              />
            );
          })}
        </g>
      </svg>
      <span className={`text-[10px] font-mono tracking-widest font-semibold mt-0.5 ${isWhite ? 'text-white/80' : 'text-slate-700'}`}>
        {code}
      </span>
    </div>
  );
}

// Scalloped Top Ribbon SVG
function ScallopedTopEdge({ fill = "#ffffff" }) {
  const d = "M 0 50 L 0 44 A 32 32 0 0 1 32 12 A 14.0 14.0 0 0 0 60.00 12 A 14.0 14.0 0 0 0 88.00 12 A 14.0 14.0 0 0 0 116.00 12 A 14.0 14.0 0 0 0 144.00 12 A 14.0 14.0 0 0 0 172.00 12 A 14.0 14.0 0 0 0 200.00 12 A 14.0 14.0 0 0 0 228.00 12 A 14.0 14.0 0 0 0 256.00 12 A 14.0 14.0 0 0 0 284.00 12 A 14.0 14.0 0 0 0 312.00 12 A 14.0 14.0 0 0 0 340.00 12 A 14.0 14.0 0 0 0 368.00 12 A 32 32 0 0 1 400 44 L 400 50 Z";
  return (
    <svg 
      viewBox="0 0 400 50" 
      preserveAspectRatio="none" 
      className="w-full h-10 block -mb-0.5"
    >
      <path d={d} fill={fill} />
    </svg>
  );
}

// Scalloped Bottom Ribbon SVG
function ScallopedBottomEdge({ fill = "#e11d48" }) {
  const d = "M 0 0 L 400 0 L 400 6 A 32 32 0 0 1 368 38 A 14.0 14.0 0 0 0 340.00 38 A 14.0 14.0 0 0 0 312.00 38 A 14.0 14.0 0 0 0 284.00 38 A 14.0 14.0 0 0 0 256.00 38 A 14.0 14.0 0 0 0 228.00 38 A 14.0 14.0 0 0 0 200.00 38 A 14.0 14.0 0 0 0 172.00 38 A 14.0 14.0 0 0 0 144.00 38 A 14.0 14.0 0 0 0 116.00 38 A 14.0 14.0 0 0 0 88.00 38 A 14.0 14.0 0 0 0 60.00 38 A 14.0 14.0 0 0 0 32.00 38 A 32 32 0 0 1 0 6 Z";
  return (
    <svg 
      viewBox="0 0 400 50" 
      preserveAspectRatio="none" 
      className="w-full h-10 block -mt-0.5"
    >
      <path d={d} fill={fill} />
    </svg>
  );
}

export default function TicketPass({ attendee, onBack, eventSettings }) {
  const ticketRef = useRef(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingImg, setDownloadingImg] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  // Color themes: 'crimson' (matching user image model) or 'emerald'
  const [ticketTheme, setTicketTheme] = useState('crimson');

  if (!attendee) return null;

  // Number format: (MEMC1001) - only the number is needed
  const getTicketNumber = () => {
    if (!attendee) return 'MEMC1001';
    const regId = attendee.registration_id || '';
    if (/^MEMC\d+$/i.test(regId)) {
      return regId.toUpperCase();
    }
    const digits = regId.match(/\d+$/);
    if (digits) {
      const n = parseInt(digits[0], 10);
      return `MEMC${n >= 1000 ? n : 1000 + n}`;
    }
    const idNum = attendee.id || 1;
    return `MEMC${1000 + idNum}`;
  };

  const ticketNumber = getTicketNumber();

  // Theme definition
  const themes = {
    crimson: {
      bottomHex: '#e11d48',
      bottomBg: 'bg-rose-600',
      bottomGradient: 'bg-gradient-to-b from-rose-600 via-rose-600 to-rose-700',
      accentColor: 'text-rose-600',
      tagColor: 'text-rose-100',
      badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
      btnDownload: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
    },
    emerald: {
      bottomHex: '#047857',
      bottomBg: 'bg-emerald-700',
      bottomGradient: 'bg-gradient-to-b from-emerald-700 via-emerald-700 to-emerald-800',
      accentColor: 'text-emerald-700',
      tagColor: 'text-emerald-100',
      badgeBg: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      btnDownload: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
    }
  };

  const currentTheme = themes[ticketTheme] || themes.crimson;
  const isAdmitted = attendee.status === 'Admitted';

  // Download high-resolution PDF
  const handleDownloadPDF = async () => {
    if (!ticketRef.current) return;
    try {
      setDownloadingPdf(true);
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 5, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight() - 10));
      pdf.save(`Ticket_Pass_${ticketNumber}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('Failed to generate PDF. You can use Print Ticket instead.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Download high-resolution PNG image
  const handleDownloadImage = async () => {
    if (!ticketRef.current) return;
    try {
      setDownloadingImg(true);
      const canvas = await html2canvas(ticketRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `Ticket_Pass_${ticketNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Image export error:', err);
      alert('Failed to save image.');
    } finally {
      setDownloadingImg(false);
    }
  };

  // Print ticket directly
  const handlePrint = () => {
    window.print();
  };

  // Share link
  const handleShareLink = () => {
    const url = `${window.location.origin}/ticket/${ticketNumber}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Top Action Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>New Registration</span>
        </button>

        {/* Share button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleShareLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= VERTICAL DIE-CUT PASS CONTAINER ================= */}
      <div 
        ref={ticketRef} 
        id="printable-ticket"
        className="w-full max-w-[340px] sm:max-w-md mx-auto select-none relative transition-all duration-300"
        style={{ filter: 'drop-shadow(0 25px 30px rgba(0, 0, 0, 0.22))' }}
      >
        {/* Scalloped Die-Cut Top Edge */}
        <ScallopedTopEdge fill="#ffffff" />

        {/* ================= SECTION 1: EVENT DETAILS (WHITE SECTION) ================= */}
        <div className="bg-white px-4 sm:px-8 pt-4 pb-5 sm:pb-6 space-y-4 sm:space-y-5 text-slate-900 relative">
          
          {/* Header Row: Badge & Pass Label */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold uppercase tracking-widest bg-slate-100 text-slate-800 border border-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Event Ticket</span>
            </span>

            <div className="flex items-center">
              <span className="font-mono text-xs sm:text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 tracking-wider">
                {ticketNumber}
              </span>
            </div>
          </div>

          {/* Conference Official Artwork Only */}
          <div className="flex justify-center pt-1">
            <div className="w-full max-w-[260px] sm:max-w-[320px] rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-slate-950">
              <img 
                src="/muthaallim-poster.png" 
                alt="മലപ്പുറം ഈസ്റ്റ് ജില്ല മുതഅല്ലിം സമ്മേളനം" 
                className="w-full h-auto object-contain block"
              />
            </div>
          </div>

          {/* Division & College Details */}
          <div className="space-y-1.5 text-xs pt-1">
            <div className="flex items-center justify-between py-1 border-t border-slate-100">
              <span className="text-slate-400 text-[11px]">Division:</span>
              <span className="font-bold text-slate-800 text-right text-[11px]">
                {attendee.division_name}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-t border-slate-100">
              <span className="text-slate-400 text-[11px]">Dars / College:</span>
              <span className="font-bold text-slate-800 text-right text-[11px] max-w-[190px] sm:max-w-[240px] truncate" title={attendee.college}>
                {attendee.college}
              </span>
            </div>
          </div>
        </div>

        {/* ================= PERFORATED DIVIDER / TRANSITION STRIP ================= */}
        <div className="relative bg-white py-1">
          {/* Left Cutout Half-Circle Notch */}
          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 shadow-inner z-20" />
          
          {/* Dashed Perforation Tear-Line */}
          <div className="w-full border-t-2 border-dashed border-slate-300 px-4" />
          
          {/* Right Cutout Half-Circle Notch */}
          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-100 border border-slate-200/80 shadow-inner z-20" />
        </div>

        {/* ================= SECTION 2: QR CODE, NAME & NUMBER ONLY (RED / CRIMSON SECTION) ================= */}
        <div className={`${currentTheme.bottomGradient} text-white px-4 sm:px-8 pt-5 sm:pt-6 pb-5 sm:pb-6 space-y-3 sm:space-y-4 text-center relative overflow-hidden`}>
          {/* Subtle background Islamic geometric stars texture */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

          {/* Centered High-Resolution QR Code */}
          <div className="relative z-10 flex justify-center py-2">
            <div className="p-2.5 sm:p-3.5 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-4 border-white/40">
              {attendee.qrCode ? (
                <img
                  src={attendee.qrCode}
                  alt={`QR Code Pass for ${ticketNumber}`}
                  className="w-36 h-36 sm:w-48 sm:h-48 object-contain rounded-xl sm:rounded-2xl"
                />
              ) : (
                <div className="w-36 h-36 sm:w-48 sm:h-48 bg-slate-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-xs text-slate-400">
                  QR Loading...
                </div>
              )}
            </div>
          </div>

          {/* Registered Person's Name */}
          <div className="relative z-10 pt-1 sm:pt-2">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-heading font-black tracking-wide text-white uppercase drop-shadow-md break-words">
              {attendee.full_name}
            </h3>
          </div>

          {/* Number Only: MEMC1001 (No additional titles or prefixes) */}
          <div className="relative z-10 pb-3 sm:pb-4">
            <div className="text-2xl sm:text-4xl font-heading font-black tracking-widest text-white font-mono drop-shadow-md">
              {ticketNumber}
            </div>
          </div>
        </div>

        {/* Scalloped Die-Cut Bottom Edge */}
        <ScallopedBottomEdge fill={currentTheme.bottomHex} />
      </div>

      {/* ================= ACTION BUTTONS ================= */}
      <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2.5 sm:gap-3 no-print">
        <button
          onClick={handleDownloadPDF}
          disabled={downloadingPdf}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-2xl font-heading font-bold text-xs sm:text-sm text-white ${currentTheme.btnDownload} transition active:scale-95 disabled:opacity-75 shadow-lg cursor-pointer`}
        >
          <FileText className="w-4 h-4" />
          <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF Ticket'}</span>
        </button>

        <button
          onClick={handleDownloadImage}
          disabled={downloadingImg}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-2xl font-heading font-bold text-xs sm:text-sm text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition active:scale-95 disabled:opacity-75 cursor-pointer"
        >
          <ImageIcon className="w-4 h-4 text-rose-600" />
          <span>{downloadingImg ? 'Exporting Image...' : 'Save as Image (PNG)'}</span>
        </button>

        <button
          onClick={handlePrint}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-heading font-bold text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-sm transition active:scale-95 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-slate-500" />
          <span>Print Pass</span>
        </button>
      </div>
    </div>
  );
}
