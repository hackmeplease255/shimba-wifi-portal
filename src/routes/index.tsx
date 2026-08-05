import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import {
  ArrowRight,
  Loader2,
  Wifi,
  Ticket,
  ShoppingCart,
  CreditCard,
  Shield,
  Phone,
  AlertCircle,
  CheckCircle2,
  Copy,
  Info,
  Check,
  Smartphone,
} from "lucide-react";

import { api, ApiError, type Package } from "../lib/api/endpoints";

// ── Brand Configuration ──
// Override via VITE_PORTAL_BRAND_NAME env variable for multi-brand support
const BRAND_NAME = (import.meta as any).env.VITE_PORTAL_BRAND_NAME || "SHIMBA";
const BRAND_TAGLINE = (import.meta as any).env.VITE_PORTAL_TAGLINE || "Unganisha kwa haraka";
const BRAND_SUPPORT_PHONE = (import.meta as any).env.VITE_PORTAL_SUPPORT_PHONE || "0772940535";
const BRAND_LOGO_LETTER = BRAND_NAME.charAt(0);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [            { title: `${BRAND_NAME} WIFI — ${BRAND_TAGLINE}` },
      {
        name: "description",
        content:
          `${BRAND_NAME} WIFI hotspot portal. Tumia vocha yako au nunua kifurushi cha internet kwa haraka na salama.`,
      },
      { property: "og:title", content: `${BRAND_NAME} WIFI` },
      { property: "og:description", content: `Portal ya ${BRAND_NAME} WIFI — tumia au nunua vocha ya internet.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "use" | "buy";

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Hitilafu isiyojulikana. Jaribu tena.";
}

function formatTZS(tzs: number): string {
  return `TZS ${tzs.toLocaleString("en-US")}`;
}

function formatLimit(mb?: number | null): string {
  if (!mb || mb <= 0) return "";
  return mb >= 1024 ? `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB` : `${mb} MB`;
}

function packageDurationLabel(days: number): string {
  if (days <= 1) return "Saa 24";
  return `Siku ${days}`;
}

function Index() {
  const [tab, setTab] = useState<Tab>("use");
  const [prefillCode, setPrefillCode] = useState("");
  // When the user just bought a voucher, "Tumia Vocha" auto-activates it
  // instantly — no second click needed.
  const [autoActivate, setAutoActivate] = useState(false);

  // ── Instant packages on "Nunua Vocha" ──
  // Prefetch the package list on page load (same queryKey + queryFn as
  // BuyVoucherForm) so the dropdown is already in the query cache the
  // moment the user clicks "Nunua Vocha" — no "Inapakia vifurushi..." wait.
  const routerKey = getRouterKeyFromUrl();
  useQuery({
    queryKey: ["packages", routerKey],
    queryFn: ({ signal }) => api.listPackages(routerKey, signal),
    staleTime: 60_000,
    retry: 1,
  });

  // ── Support phone from the system (whatsapp_admin_phone setting) ──
  // Shown to customers who hit a problem. Falls back to the env value if
  // the backend call fails or nothing is configured.
  const supportPhoneQ = useQuery({
    queryKey: ["support-phone"],
    queryFn: ({ signal }) => api.getSupportPhone(signal),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  const supportPhone = supportPhoneQ.data?.phone || BRAND_SUPPORT_PHONE;

  return (
    <main className="min-h-screen w-full flex flex-col items-center px-4 py-8 sm:py-14">
      <div className="w-full max-w-[500px]">
        <header className="flex items-center gap-3 mb-6 px-1">
          <div className="relative h-12 w-12 rounded-2xl gradient-brand flex items-center justify-center shadow-[0_10px_30px_-10px_var(--brand-pink)]">
            <span className="text-white font-black text-2xl leading-none">{BRAND_LOGO_LETTER}</span>
            <span className="absolute -inset-px rounded-2xl ring-1 ring-white/40 pointer-events-none" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight">
              <span className="text-gradient-brand">{BRAND_NAME}</span>{" "}
              <span className="text-foreground">WIFI</span>
            </h1>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-emerald-600">LIVE</span>
            </div>
          </div>
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 border border-slate-200">
            <Wifi className="h-5 w-5 text-slate-500" />
          </div>
        </header>

        <div className="glass-card rounded-3xl p-2 sm:p-3">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100/80 border border-slate-200">
            <TabButton active={tab === "use"} onClick={() => { setTab("use"); setPrefillCode(""); }} icon={<Ticket className="h-4 w-4" />} label="Tumia Vocha" />
            <TabButton active={tab === "buy"} onClick={() => setTab("buy")} icon={<ShoppingCart className="h-4 w-4" />} label="Nunua Vocha" />
          </div>

          <div className="p-4 sm:p-6">
            <div key={tab + prefillCode} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              {tab === "use" ? (
                <UseVoucherForm
                  onBuyVoucher={() => setTab("buy")}
                  prefillCode={prefillCode}
                  autoActivate={autoActivate}
                  supportPhone={supportPhone}
                />
              ) : (
                <BuyVoucherForm
                  onVoucherIssued={(code: string) => {
                    setPrefillCode(code);
                    setAutoActivate(true);
                    setTab("use");
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-[var(--brand-pink)]" />
            <span>
              Msaada: Piga{" "}
              <a href={`tel:${supportPhone}`} className="font-semibold text-foreground hover:text-[var(--brand-pink)] transition-colors">
                {supportPhone}
              </a>{" "}
              kama una tatizo lolote
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-gradient-brand">{BRAND_NAME} WIFI</span>
          </p>
        </footer>
      </div>
    </main>
  );
}

// ---------- Use Voucher ----------

function getMacFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("mac") || "";
}

function getIpFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("ip") || "";
}

function getRouterKeyFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("router") || "";
}

function getLinkOrigFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("link-orig") || "";
}

function getLinkLoginFromUrl(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("link-login") || "http://192.168.88.1/login";
}

/**
 * After successful activation, wait 2s then auto-submit the
 * voucher code to the MikroTik hotspot login as username+password.
 * Since the backend creates the hotspot user via WireGuard instantly,
 * no scheduler delay is needed — 2s is just for UX (show success msg).
 */
function autoLoginToMikrotik(voucherCode: string) {
  const loginUrl = getLinkLoginFromUrl();
  setTimeout(() => {
    try {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = loginUrl;
      form.style.display = "none";

      const username = document.createElement("input");
      username.type = "hidden";
      username.name = "username";
      username.value = voucherCode;

      const password = document.createElement("input");
      password.type = "hidden";
      password.name = "password";
      password.value = voucherCode;

      form.appendChild(username);
      form.appendChild(password);
      document.body.appendChild(form);
      form.submit();
      // Browser leaves the SPA — user gets redirected to MikroTik login result
    } catch {
      // Fallback: redirect to login page
      window.location.href = loginUrl + "?username=" + encodeURIComponent(voucherCode);
    }
  }, 5000);
}

function getVoucherErrorInfo(error: unknown): { message: string } | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === "NOT_FOUND") {
    return {
      message: "Vocha uliyoingiza haipo. Tafadhali nunua vocha.",
    };
  }
  if (error.code === "VOUCHER_ALREADY_USED") {
    return {
      message: "Vocha imeshatumika.",
    };
  }
  if (error.code === "VOUCHER_EXPIRED") {
    return {
      message: "Vocha imeisha muda wake.",
    };
  }
  if (error.code === "VOUCHER_DISABLED") {
    return {
      message: "Vocha hii imesimamishwa. Tafadhali wasiliana na msaada.",
    };
  }
  if (error.code === "ROUTER_NOT_REGISTERED") {
    return {
      message: "Mtandao huu bado haijaungana. Tafadhali wasiliana na msaada.",
    };
  }
  if (error.code === "ROUTER_MISMATCH") {
    return {
      message:
        "Vocha hii ni ya mtandao mwingine. Nunua vocha ya mtandao huu ili kuunganishwa.",
    };
  }
  return null;
}

function UseVoucherForm({
  onBuyVoucher,
  prefillCode = "",
  autoActivate = false,
  supportPhone = BRAND_SUPPORT_PHONE,
}: {
  onBuyVoucher: () => void;
  prefillCode?: string;
  autoActivate?: boolean;
  supportPhone?: string;
}) {
  const [code, setCode] = useState(prefillCode);
  const macAddress = getMacFromUrl();
  const ipAddress = getIpFromUrl();
  const routerKey = getRouterKeyFromUrl();
  const [activating, setActivating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const autoFiredRef = useRef(false);

  const mutation = useMutation({
    mutationFn: (voucherCode: string) =>
      api.activateVoucher(voucherCode.trim(), macAddress, ipAddress, routerKey),
    onSuccess: (data) => {
      setActivating(true);
      // Show the Connected screen for 3 seconds, then redirect to Google so
      // the device detects live internet. The MikroTik already has the
      // bypass binding from the backend REST API (pushed instantly in
      // background), so the user is authenticated the moment this screen
      // appears — the delay is only so the success screen is readable.
      setTimeout(() => {
        window.location.href = "https://www.google.com";
      }, 3000);
    },
  });

  // ── Instant activation after buying a voucher ──
  // When the user just paid and clicks "Tumia Vocha", the code is prefilled
  // and autoActivate is set — fire the activation immediately, no second
  // click needed. Internet comes on the moment the router pushes the
  // bypass binding (background, ~1s).
  useEffect(() => {
    if (!autoActivate || autoFiredRef.current) return;
    if (!code.trim()) return;
    if (!macAddress) {
      setNotice(
        `Unaweza kununua vocha na kuziona kutoka popote. Lakini ili kuwasha internet, unganisha kwenye mtandao wa ${BRAND_NAME} WIFI kwanza (WiFi ya Shimba), kisha fungua portal tena kupitia ujumbe wa kuingia (login redirect) wa mtandao huo.`
      );
      return;
    }
    autoFiredRef.current = true;
    setNotice(null);
    mutation.mutate(code);
  }, [autoActivate, code, macAddress]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    // mac is required (comes from the hotspot redirect) so the router can
    // bind this device. router is OPTIONAL — without it the backend falls
    // back to trying all known routers (single-router setups just work).
    if (!macAddress) {
      setNotice(
        `Unaweza kununua vocha na kuziona kutoka popote. Lakini ili kuwasha internet, unganisha kwenye mtandao wa ${BRAND_NAME} WIFI kwanza (WiFi ya Shimba), kisha fungua portal tena kupitia ujumbe wa kuingia (login redirect) wa mtandao huo.`
      );
      return;
    }
    setNotice(null);
    mutation.mutate(code);
  };

  // After success, show beautiful connected page instead of form
  if (activating) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const expiryDate = mutation.data?.expires_at
      ? new Date(mutation.data.expires_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
    const expiryTime = mutation.data?.expires_at
      ? new Date(mutation.data.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <div className="space-y-5 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/15 border-2 border-emerald-400/40 flex items-center justify-center mb-4">
            <Wifi className="h-10 w-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gradient-brand">Umeunganishwa!</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Karibu {BRAND_NAME} WIFI. Sasa unaweza kutumia internet kwa uhuru.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 border border-slate-200">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Connection time</span>
            <span className="text-slate-800 font-semibold">{timeStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Voucher</span>
            <span className="text-slate-800 font-semibold font-mono tracking-wider">{code}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Expires</span>
            <span className="text-slate-800 font-semibold">{expiryDate} {expiryTime}</span>
          </div>
          <div className="pt-3 border-t border-slate-100 text-center">
            <a href={`tel:${supportPhone}`} className="inline-flex items-center gap-2 text-sm text-[var(--brand-pink)] hover:underline">
              <Phone className="h-4 w-4" />
              Msaada: {supportPhone}
            </a>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-center">
          <p className="text-xs text-emerald-600/80">
            Unaweza kufungua browser na kuanza kutumia internet mara moja.
            Ukiona "No Internet", subiri sekunde chache — internet ipo tayari.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-pink)]" />
            Inakupeleka kwenye internet...
          </div>
        </div>
      </div>
    );
  }

  // Determine if the error is a voucher-specific error
  const voucherError = mutation.isError ? getVoucherErrorInfo(mutation.error) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Tumia Vocha</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Weka voucher uliyonunua ili kuanza kutumia internet.
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="voucher-code" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Voucher Code
        </label>
        <input
          id="voucher-code"
          value={code}
          onChange={(e) => { setCode(e.target.value); setNotice(null); }}
          placeholder="Ingiza Voucher Code"
          autoComplete="off"
          disabled={mutation.isPending}
          className="w-full h-14 rounded-2xl bg-white border border-slate-200 px-5 text-base font-medium tracking-wide outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-[var(--brand-pink)] focus:bg-slate-50 focus:shadow-[0_0_0_4px_oklch(0.66_0.24_5_/_15%)] disabled:opacity-60"
        />
      </div>

      {notice && <ErrorBanner message={notice} />}

      {voucherError ? (
        <VoucherErrorBanner message={voucherError.message} onBuyVoucher={onBuyVoucher} />
      ) : (
        mutation.isError && <ErrorBanner message={errorMessage(mutation.error)} />
      )}

      {mutation.isSuccess && (
        <SuccessBanner
          title="Umeunganishwa!"
          message="Voucher yako imeanza kutumika. Sasa unaweza kutumia internet."
        />
      )}

      <PrimaryButton
        pending={mutation.isPending}
        pendingLabel="Inaunganisha..."
        icon={<ArrowRight className="h-5 w-5" />}
        label="Unganisha na WiFi"
        disabled={!code.trim()}
      />

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Shield className="h-3.5 w-3.5" />
        Voucher yako itahakikiwa kabla ya kukupa internet.
      </p>
    </form>
  );
}

// ---------- Buy Voucher ----------

function BuyVoucherForm({ onVoucherIssued }: { onVoucherIssued: (code: string) => void }) {
  // Router-scoped package list: only this router's packages are shown.
  const routerKey = getRouterKeyFromUrl();
  const packagesQuery = useQuery({
    queryKey: ["packages", routerKey],
    queryFn: ({ signal }) => api.listPackages(routerKey, signal),
    staleTime: 60_000,
    retry: 1,
  });

  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  // Track the selected package for display in voucher view. The customer
  // must deliberately pick a package — nothing is pre-selected, so
  // "Lipa Sasa" stays disabled until the user chooses one.
  const handlePackageChange = (id: number) => {
    setSelectedPackageId(id);
    const pkg = packagesQuery.data?.find((p) => p.id === id) ?? null;
    setSelectedPackage(pkg);
  };

  // ⏱️ Max 120 polls (~3 minutes at 1.5s) before timing out to avoid
  // infinite polling while still giving slow mobile-money confirmations time.
  const MAX_POLLS = 120;
  const pollCountRef = useRef(0);

  const createPayment = useMutation({
    mutationFn: () =>
      api.createPayment({ package_id: selectedPackageId!, phone, router_key: routerKey }),
    onSuccess: (data) => {
      // New payment → fresh poll budget (a previously timed-out payment must
      // not exhaust the next one's budget).
      pollCountRef.current = 0;
      setReference(data.orderReference);
    },
  });

  const statusQuery = useQuery({
    queryKey: ["payment", reference],
    queryFn: ({ signal }) => api.getPaymentStatus(reference!, signal),
    enabled: !!reference,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 1500;
      pollCountRef.current++;
      if (pollCountRef.current >= MAX_POLLS) {
        return false; // Stop polling after the timeout window
      }
      return d.paid || d.status === "FAILED" ? false : 1500;
    },
    retry: 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageId || !/^0[67]\d{8}$/.test(phone)) return;
    createPayment.mutate();
  };

  const handleReset = () => {
    pollCountRef.current = 0; // reset poll budget for the next purchase
    setReference(null);
    createPayment.reset();
  };

  // Voucher issued — payment confirmed and voucher_code received
  const paymentData = statusQuery.data;
  if (paymentData?.paid && paymentData.voucher_code) {
    return (
      <VoucherIssuedView
        code={paymentData.voucher_code}
        packageName={selectedPackage?.name ?? null}
        packagePrice={selectedPackage?.price ?? null}
        onUseNow={() => onVoucherIssued(paymentData.voucher_code!)}
        onBuyAnother={handleReset}
      />
    );
  }

  // Payment in flight
  if (reference) {
    const isFailed = paymentData?.status === "FAILED" || createPayment.isError;
    return (
      <PaymentInFlightView
        failed={isFailed}
        message={createPayment.isError ? errorMessage(createPayment.error) : paymentData ? undefined : undefined}
        error={statusQuery.isError ? errorMessage(statusQuery.error) : null}
        onCancel={handleReset}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-bold">Nunua Vocha</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Chagua kifurushi, weka namba ya simu, kisha lipa kupitia mtandao wako wa simu.
        </p>
      </div>

      {/* Mobile money networks we accept */}
      <NetworkStrip />

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Chagua Kifurushi
        </label>
        <PackageList
          query={packagesQuery}
          selectedId={selectedPackageId}
          onChange={handlePackageChange}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone-number" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Namba ya Simu
        </label>
        <input
          id="phone-number"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
          inputMode="numeric"
          pattern="0[67]\d{8}"
          placeholder="07XXXXXXXX"
          autoComplete="off"
          disabled={createPayment.isPending}
          className="w-full h-14 rounded-2xl bg-white border border-slate-200 px-5 text-base font-medium tracking-wide outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-[var(--brand-pink)] focus:bg-slate-50 focus:shadow-[0_0_0_4px_oklch(0.66_0.24_5_/_15%)] disabled:opacity-60"
        />
        {phone.length > 0 && !/^0[67]\d{8}$/.test(phone) && (
          <p className="text-[11px] text-red-600 flex items-center gap-1 mt-1.5">
            <AlertCircle className="h-3 w-3 shrink-0" /> Namba si sahihi — mfano: 07XXXXXXXX
          </p>
        )}
      </div>

      {createPayment.isError && <ErrorBanner message={errorMessage(createPayment.error)} />}

      {/* Selected package summary — directly above Lipia Sasa */}
      {selectedPackage ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-center justify-between gap-3">
          <span className="text-sm text-emerald-800">
            <span className="font-semibold">Selected:</span>{" "}
            <span className="font-bold">{selectedPackage.name} — {formatTZS(selectedPackage.price)}</span>
          </span>
          <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            {packageDurationLabel(selectedPackage.duration_days)}
          </span>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3 text-center text-xs text-muted-foreground">
          Chagua kifurushi kwanza ili kuona muhtasari wa malipo
        </div>
      )}

      {/* M-Pesa Temporary Unavailable Warning — above Lipia Sasa */}
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <div className="font-semibold text-amber-800">M-Pesa (Vodacom)</div>
          <div className="text-amber-700 mt-1 leading-relaxed">
            Malipo kupitia M-Pesa yatakuwa available hivi karibuni. Kwa sasa tumia <strong>Tigo Pesa</strong>, <strong>Airtel Money</strong>, au <strong>HaloPesa</strong> kulipia kifurushi chako.
          </div>
        </div>
      </div>

      <PrimaryButton
        pending={createPayment.isPending}
        pendingLabel="Inatuma..."
        icon={<CreditCard className="h-5 w-5" />}
        label="Lipa Sasa"
        disabled={!selectedPackageId || !/^0[67]\d{8}$/.test(phone) || packagesQuery.isLoading}
      />

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Baada ya malipo kuthibitishwa, voucher itatengenezwa moja kwa moja na kuonyeshwa hapa.
      </p>
    </form>
  );
}

const SUPPORTED_NETWORKS = [
  { name: "Tigo", color: "#1e8fe0" },
  { name: "Airtel", color: "#e3120b" },
  { name: "Halotel", color: "#7c3aed" },
  { name: "TTCL", color: "#0284c7" },
  { name: "Zantel", color: "#f59e0b" },
];

function NetworkStrip() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        <Smartphone className="h-3.5 w-3.5" />
        Tunakubali malipo kutoka mitandao hii
      </div>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_NETWORKS.map((n) => (
          <span
            key={n.name}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700"
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: n.color }} />
            {n.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function PackageList({
  query,
  selectedId,
  onChange,
}: {
  query: ReturnType<typeof useQuery<Package[], Error>>;
  selectedId: number | null;
  onChange: (id: number) => void;
}) {
  if (query.isLoading) {
    return (
      <div className="w-full h-14 rounded-2xl bg-white border border-slate-200 px-5 flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Inapakia vifurushi...
      </div>
    );
  }
  if (query.isError) {
    return <ErrorBanner message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
  }
  const packages = query.data ?? [];
  if (packages.length === 0) {
    return <ErrorBanner message="Hakuna vifurushi vinavyopatikana kwa sasa." />;
  }
  return (
    <div role="radiogroup" aria-label="Chagua kifurushi" className="space-y-2.5">
      {packages.map((p) => {
        const selected = selectedId === p.id;
        const perks = [
          p.data_limit_mb ? `Data: ${formatLimit(p.data_limit_mb)}` : "",
          p.speed_limit_mbps ? `Speed: ${p.speed_limit_mbps} Mbps` : "",
        ].filter(Boolean);
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(p.id)}
            className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 flex items-center gap-3 ${
              selected
                ? "border-[var(--brand-pink)] bg-[var(--brand-pink)]/5 shadow-[0_8px_25px_-12px_var(--brand-pink)]"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 active:scale-[0.995]"
            }`}
          >
            <span
              className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                selected ? "border-[var(--brand-pink)] bg-[var(--brand-pink)]" : "border-slate-300 bg-white"
              }`}
            >
              {selected && <Check className="h-3 w-3 text-white" strokeWidth={3.5} />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-bold">{p.name}</span>
                <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                  {packageDurationLabel(p.duration_days)}
                </span>
              </span>
              {p.description && (
                <span className="block text-xs text-muted-foreground mt-1">{p.description}</span>
              )}
              {perks.length > 0 && (
                <span className="block text-xs text-muted-foreground mt-1">{perks.join(" · ")}</span>
              )}
            </span>
            <span className="shrink-0 text-base font-black text-gradient-brand">
              {formatTZS(p.price)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function PaymentInFlightView({
  failed,
  message,
  error,
  onCancel,
}: {
  failed: boolean;
  message?: string;
  error: string | null;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-5 py-2">
      <div className="flex flex-col items-center text-center gap-4">
        {failed ? (
          <div className="h-16 w-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        ) : (
          <div className="h-16 w-16 rounded-full gradient-brand flex items-center justify-center shadow-[0_15px_40px_-15px_var(--brand-pink)]">
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold">
            {failed ? "Malipo hayakukamilika" : "Subiri malipo yathibitishwe"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            {error ??
              message ??
              (failed
                ? "Tafadhali jaribu tena."
                : "Angalia simu yako na thibitisha ombi la malipo lililotumwa.")}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="w-full h-12 rounded-2xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-100 transition-colors"
      >
        {failed ? "Jaribu Tena" : "Ghairi"}
      </button>
    </div>
  );
}

function VoucherIssuedView({
  code,
  packageName,
  packagePrice,
  onUseNow,
  onBuyAnother,
}: {
  code: string;
  packageName: string | null;
  packagePrice: number | null;
  onUseNow: () => void;
  onBuyAnother: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center text-center gap-3">
        <div className="h-16 w-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Malipo Yamekamilika</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Voucher yako iko tayari. Tumia nambari hii kuunganisha WiFi.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 border border-slate-200">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">
          Voucher Code
        </div>
        <div className="text-center text-2xl sm:text-3xl font-black tracking-widest text-gradient-brand break-all">
          {code}
        </div>
        <button
          type="button"
          onClick={copy}
          className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Imenakiliwa ✓" : "Copy Vocha"}
        </button>
        {(packageName || packagePrice) && (
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-slate-100">
            <span>{packageName ?? "—"}</span>
            <span>{packagePrice !== null ? formatTZS(packagePrice) : "—"}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onUseNow}
        className="group relative w-full h-14 rounded-2xl gradient-brand font-semibold text-white shadow-[0_15px_40px_-15px_var(--brand-purple)] transition-all duration-300 hover:shadow-[0_20px_50px_-15px_var(--brand-pink)] hover:-translate-y-0.5"
      >
        <span className="flex items-center justify-center gap-2">
          <Ticket className="h-5 w-5" />
          Tumia Vocha
        </span>
      </button>
      <button
        type="button"
        onClick={onBuyAnother}
        className="w-full h-12 rounded-2xl border border-slate-200 bg-white text-sm font-semibold hover:bg-slate-100 transition-colors"
      >
        Nunua Nyingine
      </button>
    </div>
  );
}

// ---------- Shared UI ----------

function PrimaryButton({
  pending,
  pendingLabel,
  icon,
  label,
  disabled,
}: {
  pending: boolean;
  pendingLabel: string;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="group relative w-full h-14 rounded-2xl gradient-brand font-semibold text-white shadow-[0_15px_40px_-15px_var(--brand-purple)] transition-all duration-300 hover:shadow-[0_20px_50px_-15px_var(--brand-pink)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:cursor-not-allowed overflow-hidden"
    >
      <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      <span className="relative flex items-center justify-center gap-2">
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {pendingLabel}
          </>
        ) : (
          <>
            {icon}
            {label}
          </>
        )}
      </span>
    </button>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-red-800">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold text-red-700 hover:text-red-900 transition-colors underline underline-offset-2"
        >
          Jaribu Tena
        </button>
      )}
    </div>
  );
}

function VoucherErrorBanner({ message, onBuyVoucher }: { message: string; onBuyVoucher: () => void }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-red-800">{message}</div>
      </div>
      <button
        type="button"
        onClick={onBuyVoucher}
        className="w-full h-11 rounded-xl gradient-brand text-white text-sm font-semibold hover:shadow-[0_10px_30px_-10px_var(--brand-pink)] transition-all duration-300 flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <ShoppingCart className="h-4 w-4" />
        Nunua Vocha
      </button>
    </div>
  );
}

function SuccessBanner({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-start gap-3">
      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-emerald-800">{title}</div>
        <div className="text-emerald-700 mt-0.5">{message}</div>
      </div>
    </div>
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
          : "text-muted-foreground hover:text-foreground hover:bg-slate-100"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
