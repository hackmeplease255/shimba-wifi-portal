import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Loader2,
  Wifi,
  Ticket,
  ShoppingCart,
  CreditCard,
  ChevronDown,
  Shield,
  Phone,
  AlertCircle,
  CheckCircle2,
  Copy,
} from "lucide-react";

import { api, ApiError, type Package, type PaymentStatus } from "../lib/api/endpoints";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SHIMBA WIFI — Unganisha kwa haraka" },
      {
        name: "description",
        content:
          "SHIMBA WIFI hotspot portal. Tumia vocha yako au nunua kifurushi cha internet kwa haraka na salama.",
      },
      { property: "og:title", content: "SHIMBA WIFI" },
      { property: "og:description", content: "Portal ya SHIMBA WIFI — tumia au nunua vocha ya internet." },
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

function formatPrice(tzs: number): string {
  return `${tzs.toLocaleString("en-US")} TZS`;
}

function Index() {
  const [tab, setTab] = useState<Tab>("use");

  return (
    <main className="min-h-screen w-full flex flex-col items-center px-4 py-8 sm:py-14">
      <div className="w-full max-w-[500px]">
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

        <div className="glass-card rounded-3xl p-2 sm:p-3">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/20 border border-white/5">
            <TabButton active={tab === "use"} onClick={() => setTab("use")} icon={<Ticket className="h-4 w-4" />} label="Tumia Vocha" />
            <TabButton active={tab === "buy"} onClick={() => setTab("buy")} icon={<ShoppingCart className="h-4 w-4" />} label="Nunua Vocha" />
          </div>

          <div className="p-4 sm:p-6">
            <div key={tab} className="animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
              {tab === "use" ? <UseVoucherForm onBuyVoucher={() => setTab("buy")} /> : <BuyVoucherForm onVoucherIssued={() => setTab("use")} />}
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-muted-foreground">
            <Phone className="h-3.5 w-3.5 text-[var(--brand-pink)]" />
            <span>
              Msaada: Piga{" "}
              <a href="tel:0772940535" className="font-semibold text-foreground hover:text-[var(--brand-pink)] transition-colors">
                0772940535
              </a>{" "}
              kama una tatizo lolote
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-gradient-brand">SHIMBA WIFI</span>
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

function getVoucherErrorInfo(error: unknown): { message: string } | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === "NOT_FOUND") {
    return {
      message:
        "Vocha uliyoitingiza haipo. Tafadhali bonyeza Nunua Vocha na ununue vocha.",
    };
  }
  if (error.code === "VOUCHER_ALREADY_USED") {
    return {
      message:
        "Vocha hii tayari imetumika. Bonyeza Nunua Vocha na ununue vocha mpya.",
    };
  }
  return null;
}

function UseVoucherForm({ onBuyVoucher }: { onBuyVoucher: () => void }) {
  const [code, setCode] = useState("");
  const macAddress = getMacFromUrl();
  const ipAddress = getIpFromUrl();

  const mutation = useMutation({
    mutationFn: (voucherCode: string) =>
      api.activateVoucher(voucherCode.trim(), macAddress, ipAddress),
    onSuccess: () => {
      // Activation succeeded — session and IP binding created
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (!macAddress) {
      // If no MAC in URL, the user may not be on the MikroTik network
      alert("Tafadhali unganisha kwenye mtandao wa SHIMBA WIFI kwanza.");
      return;
    }
    mutation.mutate(code);
  };

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
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Voucher Code
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Ingiza Voucher Code"
          autoComplete="off"
          disabled={mutation.isPending}
          className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 px-5 text-base font-medium tracking-wide outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-[var(--brand-pink)] focus:bg-black/40 focus:shadow-[0_0_0_4px_oklch(0.66_0.24_5_/_15%)] disabled:opacity-60"
        />
      </div>

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

function BuyVoucherForm({ onVoucherIssued }: { onVoucherIssued: () => void }) {
  const packagesQuery = useQuery({
    queryKey: ["packages"],
    queryFn: ({ signal }) => api.listPackages(signal),
    staleTime: 60_000,
    retry: 1,
  });

  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  useEffect(() => {
    if (packagesQuery.data && packagesQuery.data.length > 0 && selectedPackageId === null) {
      const first = packagesQuery.data[0];
      setSelectedPackageId(first.id);
      setSelectedPackage(first);
    }
  }, [packagesQuery.data, selectedPackageId]);

  // Track the selected package for display in voucher view
  const handlePackageChange = (id: number) => {
    setSelectedPackageId(id);
    const pkg = packagesQuery.data?.find((p) => p.id === id) ?? null;
    setSelectedPackage(pkg);
  };

  const createPayment = useMutation({
    mutationFn: () =>
      api.createPayment({ package_id: selectedPackageId!, phone }),
    onSuccess: (data) => setReference(data.orderReference),
  });

  const statusQuery = useQuery({
    queryKey: ["payment", reference],
    queryFn: ({ signal }) => api.getPaymentStatus(reference!, signal),
    enabled: !!reference,
    refetchInterval: (q) => {
      const d = q.state.data;
      if (!d) return 3000;
      return d.paid || d.status === "FAILED" ? false : 3000;
    },
    retry: 2,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPackageId || !/^0[67]\d{8}$/.test(phone)) return;
    createPayment.mutate();
  };

  const handleReset = () => {
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
        onUseNow={onVoucherIssued}
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

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Kifurushi
        </label>
        <PackageSelect
          query={packagesQuery}
          selectedId={selectedPackageId}
          onChange={handlePackageChange}
        />
      </div>

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
          disabled={createPayment.isPending}
          className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 px-5 text-base font-medium tracking-wide outline-none transition-all duration-300 placeholder:text-muted-foreground/60 focus:border-[var(--brand-pink)] focus:bg-black/40 focus:shadow-[0_0_0_4px_oklch(0.66_0.24_5_/_15%)] disabled:opacity-60"
        />
      </div>

      {createPayment.isError && <ErrorBanner message={errorMessage(createPayment.error)} />}

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

function PackageSelect({
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
      <div className="w-full h-14 rounded-2xl bg-black/30 border border-white/10 px-5 flex items-center gap-3 text-sm text-muted-foreground">
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
    <div className="relative">
      <select
        value={selectedId ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-14 appearance-none rounded-2xl bg-black/30 border border-white/10 px-5 pr-12 text-base font-medium outline-none transition-all duration-300 focus:border-[var(--brand-pink)] focus:shadow-[0_0_0_4px_oklch(0.66_0.24_5_/_15%)]"
      >
        {packages.map((p) => (
          <option key={p.id} value={p.id} className="bg-[var(--navy)]">
            {p.name} — {formatPrice(p.price)}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
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
            <AlertCircle className="h-8 w-8 text-red-400" />
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
        className="w-full h-12 rounded-2xl border border-white/10 bg-black/30 text-sm font-semibold hover:bg-black/40 transition-colors"
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
          <CheckCircle2 className="h-8 w-8 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Malipo Yamekamilika</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Voucher yako iko tayari. Tumia nambari hii kuunganisha WiFi.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-5 space-y-3">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground text-center">
          Voucher Code
        </div>
        <div className="text-center text-2xl sm:text-3xl font-black tracking-widest text-gradient-brand break-all">
          {code}
        </div>
        <button
          type="button"
          onClick={copy}
          className="w-full h-11 rounded-xl border border-white/10 bg-black/20 text-sm font-semibold hover:bg-black/40 transition-colors flex items-center justify-center gap-2"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Imenakiliwa" : "Nakili"}
        </button>
        {(packageName || packagePrice) && (
          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t border-white/5">
            <span>{packageName ?? "—"}</span>
            <span>{packagePrice !== null ? formatPrice(packagePrice) : "—"}</span>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onUseNow}
        className="group relative w-full h-14 rounded-2xl gradient-brand font-semibold text-white shadow-[0_15px_40px_-15px_var(--brand-purple)] transition-all duration-300 hover:shadow-[0_20px_50px_-15px_var(--brand-pink)] hover:-translate-y-0.5"
      >
        <span className="flex items-center justify-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Tumia Sasa
        </span>
      </button>
      <button
        type="button"
        onClick={onBuyAnother}
        className="w-full h-12 rounded-2xl border border-white/10 bg-black/20 text-sm font-semibold hover:bg-black/40 transition-colors"
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
      <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-red-100">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold text-red-200 hover:text-white transition-colors underline underline-offset-2"
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
        <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-red-100">{message}</div>
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
      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm">
        <div className="font-semibold text-emerald-100">{title}</div>
        <div className="text-emerald-200/80 mt-0.5">{message}</div>
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
          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
