import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Loader2, Wifi, Ticket, ShoppingCart, CreditCard, ChevronDown, Shield, Phone } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SHIMBA WIFI — Unganisha kwa haraka" },
      { name: "description", content: "SHIMBA WIFI hotspot portal. Tumia vocha yako au nunua kifurushi cha internet kwa haraka na salama." },
      { property: "og:title", content: "SHIMBA WIFI" },
      { property: "og:description", content: "Portal ya SHIMBA WIFI — tumia au nunua vocha ya internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "use" | "buy";

const PACKAGES = [
  { label: "Masaa 24", price: "1,000 TZS" },
  { label: "Siku 7", price: "5,000 TZS" },
  { label: "Mwezi 1", price: "20,000 TZS" },
];

function Index() {
  const [tab, setTab] = useState<Tab>("use");
  const [voucher, setVoucher] = useState("");
  const [pkg, setPkg] = useState(PACKAGES[0].label);
  const [phone, setPhone] = useState("");
  
  const [loading, setLoading] = useState(false);

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 1800);
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center px-4 py-8 sm:py-14">
      <div className="w-full max-w-[500px]">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6 px-1">
          <div className="relative h-12 w-12 rounded-2xl gradient-brand flex items-center justify-center shadow-[0_10px_30px_-10px_var(--brand-pink)]">
            <span className="text-white font-black text-2xl leading-none">S</span>
            <span className="absolute -inset-px rounded-2xl ring-1 ring-white/20 pointer-events-none" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
              <span className="text-gradient-brand">SHIMBA</span>{" "}
              <span className="text-foreground">WIFI</span>
            </h1>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-emerald-300">LIVE</span>
            </div>
          </div>
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
            <Wifi className="h-5 w-5 text-white/70" />
          </div>
        </header>

        {/* Card */}
        <div className="glass-card rounded-3xl p-2 sm:p-3">
          {/* Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/20 border border-white/5">
            <TabButton active={tab === "use"} onClick={() => setTab("use")} icon={<Ticket className="h-4 w-4" />} label="Tumia Vocha" />
            <TabButton active={tab === "buy"} onClick={() => setTab("buy")} icon={<ShoppingCart className="h-4 w-4" />} label="Nunua Vocha" />
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6">
            <div key={tab} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              {tab === "use" ? (
                <form onSubmit={handleConnect} className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold">Tumia Vocha</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Weka voucher uliyonunua ili kuanza kutumia internet.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Voucher Code
                    </label>
                    <div className="relative group">
                      <input
                        value={voucher}
                        onChange={(e) => setVoucher(e.target.value)}
                        placeholder="Ingiza Voucher Code"
                        className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 px-5 text-base font-medium tracking-wide outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-[var(--brand-pink)] focus:bg-black/40 focus:shadow-[0_0_0_4px_oklch(0.66_0.24_5_/_15%)]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full h-14 rounded-2xl gradient-brand font-semibold text-white shadow-[0_15px_40px_-15px_var(--brand-purple)] transition-all duration-300 hover:shadow-[0_20px_50px_-15px_var(--brand-pink)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Inaunganisha...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="h-5 w-5" />
                          Unganisha na WiFi
                        </>
                      )}
                    </span>
                  </button>

                  <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    Voucher yako itahakikiwa kabla ya kukupa internet.
                  </p>
                </form>
              ) : (
                <form onSubmit={handlePay} className="space-y-5">
                  <div>
                    <h2 className="text-lg font-bold">Nunua Vocha</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Chagua kifurushi, weka namba ya simu, kisha lipa kupitia mtandao wako wa simu.
                    </p>
                  </div>

                  {/* Package */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Kifurushi
                    </label>
                    <div className="relative">
                      <select
                        value={pkg}
                        onChange={(e) => setPkg(e.target.value)}
                        className="w-full h-14 appearance-none rounded-2xl bg-black/30 border border-white/10 px-5 pr-12 text-base font-medium outline-none transition-all duration-300 focus:border-[var(--brand-pink)] focus:shadow-[0_0_0_4px_oklch(0.66_0.24_5_/_15%)]"
                      >
                        {PACKAGES.map((p) => (
                          <option key={p.label} value={p.label} className="bg-[var(--navy)]">
                            {p.label} — {p.price}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Namba ya Simu
                    </label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                      inputMode="numeric"
                      pattern="0[67]\d{8}"
                      placeholder="07XXXXXXXX au 06XXXXXXXX"
                      className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 px-5 text-base font-medium tracking-wide outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-[var(--brand-pink)] focus:shadow-[0_0_0_4px_oklch(0.66_0.24_5_/_15%)]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full h-14 rounded-2xl gradient-brand font-semibold text-white shadow-[0_15px_40px_-15px_var(--brand-purple)] transition-all duration-300 hover:shadow-[0_20px_50px_-15px_var(--brand-pink)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 overflow-hidden"
                  >
                    <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    <span className="relative flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Inatuma...
                        </>
                      ) : (
                        <>
                          <CreditCard className="h-5 w-5" />
                          Lipa Sasa
                        </>
                      )}
                    </span>
                  </button>

                  <p className="text-xs text-muted-foreground text-center leading-relaxed">
                    Baada ya malipo kuthibitishwa, voucher itatengenezwa moja kwa moja na kuonyeshwa hapa pamoja na kutumwa kupitia SMS ikiwa huduma hiyo itawezeshwa.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-[var(--brand-pink)]" />
            <span>Msaada: Piga <a href="tel:0772940535" className="font-semibold text-foreground hover:text-[var(--brand-pink)] transition-colors">0772940535</a> kama una tatizo lolote</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-gradient-brand">SHIMBA WIFI</span>
          </p>
        </footer>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-12 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
        active
          ? "gradient-brand text-white shadow-[0_8px_25px_-10px_var(--brand-pink)]"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
