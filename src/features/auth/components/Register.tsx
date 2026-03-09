import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/authService";
import Header from "../../../components/Header";
import { rules, collectErrors, type FieldErrors } from "../../../common/validation";

const COUNTRY_CODES = [
  { label: "🇮🇳 +91 India", value: "+91" },
  { label: "🇺🇸 +1 USA", value: "+1" },
  { label: "🇬🇧 +44 UK", value: "+44" },
  { label: "🇦🇺 +61 Australia", value: "+61" },
  { label: "🇦🇪 +971 UAE", value: "+971" },
  { label: "🇸🇬 +65 Singapore", value: "+65" },
  { label: "🇲🇾 +60 Malaysia", value: "+60" },
  { label: "🇱🇰 +94 Sri Lanka", value: "+94" },
  { label: "🇧🇩 +880 Bangladesh", value: "+880" },
  { label: "🇵🇰 +92 Pakistan", value: "+92" },
  { label: "🇳🇵 +977 Nepal", value: "+977" },
];

interface FormState {
  first_name: string; last_name: string; country_code: string;
  phone_no: string; email: string; password: string; confirmPassword: string;
}
const INIT: FormState = { first_name: "", last_name: "", country_code: "+91", phone_no: "", email: "", password: "", confirmPassword: "" };

function FieldMsg({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
      <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  );
}

function ic(err?: string) {
  return `w-full px-4 py-2.5 rounded-xl border text-[#0f1340] placeholder-slate-300 focus:outline-none focus:ring-2 focus:border-transparent transition text-sm ${
    err ? "border-red-400 bg-red-50/30 focus:ring-red-300" : "border-slate-200 bg-white focus:ring-[#3b5bfc]/30 focus:border-[#3b5bfc]"
  }`;
}

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INIT);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (f = form): FieldErrors => collectErrors({
    first_name:      rules.required(f.first_name, "First name") || rules.maxLen(f.first_name, 100, "First name"),
    last_name:       rules.required(f.last_name, "Last name") || rules.maxLen(f.last_name, 100, "Last name"),
    email:           rules.required(f.email, "Email") || rules.email(f.email) || rules.maxLen(f.email, 100, "Email"),
    phone_no:        rules.required(f.phone_no, "Phone number") || rules.phone(f.phone_no),
    password:        rules.required(f.password, "Password") || rules.password(f.password),
    confirmPassword: rules.required(f.confirmPassword, "Confirm password") || rules.confirmPassword(f.confirmPassword, f.password),
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    if (touched[e.target.name]) {
      const errs = validate(next);
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: errs[e.target.name] ?? "" }));
    }
    if (e.target.name === "password" && touched.confirmPassword) {
      const errs = validate(next);
      setFieldErrors((prev) => ({ ...prev, confirmPassword: errs.confirmPassword ?? "" }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    const name = e.target.name;
    setTouched((t) => ({ ...t, [name]: true }));
    const errs = validate();
    setFieldErrors((prev) => ({ ...prev, [name]: errs[name] ?? "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(Object.keys(INIT).map((k) => [k, true]));
    setTouched(allTouched);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;

    setServerError(""); setLoading(true);
    try {
      await registerUser({ first_name: form.first_name, last_name: form.last_name, role_id: 1, country_code: form.country_code, phone_no: form.phone_no, email: form.email, password: form.password });
      navigate("/login");
    } catch (err: any) {
      setServerError(err?.response?.data?.detail ?? "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  const lbl = "block text-sm font-medium text-[#0f1340] mb-1.5";

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif", background: "#f8faff" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Syne:wght@700;800&display=swap');`}</style>
      <Header />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#0f1340] mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>Create account</h2>
              <p className="text-sm text-slate-400">Join iClinic to manage appointments</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className={lbl}>First Name <span className="text-red-400">*</span></label>
                  <input id="first_name" name="first_name" type="text" autoComplete="given-name"
                    value={form.first_name} onChange={handleChange} onBlur={handleBlur} placeholder="John"
                    className={ic(fieldErrors.first_name)} />
                  <FieldMsg msg={fieldErrors.first_name} />
                </div>
                <div>
                  <label htmlFor="last_name" className={lbl}>Last Name <span className="text-red-400">*</span></label>
                  <input id="last_name" name="last_name" type="text" autoComplete="family-name"
                    value={form.last_name} onChange={handleChange} onBlur={handleBlur} placeholder="Doe"
                    className={ic(fieldErrors.last_name)} />
                  <FieldMsg msg={fieldErrors.last_name} />
                </div>
              </div>

              <div>
                <label htmlFor="email" className={lbl}>Email <span className="text-red-400">*</span></label>
                <input id="email" name="email" type="email" autoComplete="email"
                  value={form.email} onChange={handleChange} onBlur={handleBlur} placeholder="you@example.com"
                  className={ic(fieldErrors.email)} />
                <FieldMsg msg={fieldErrors.email} />
              </div>

              <div>
                <label htmlFor="phone_no" className={lbl}>Phone Number <span className="text-red-400">*</span></label>
                <div className="flex gap-2">
                  <select name="country_code" value={form.country_code} onChange={handleChange} onBlur={handleBlur}
                    className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[#0f1340] focus:outline-none focus:ring-2 focus:ring-[#3b5bfc]/30 focus:border-[#3b5bfc] text-sm flex-shrink-0 transition">
                    {COUNTRY_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <div className="flex-1">
                    <input id="phone_no" name="phone_no" type="tel" autoComplete="tel"
                      value={form.phone_no} onChange={handleChange} onBlur={handleBlur} placeholder="9876543210"
                      className={ic(fieldErrors.phone_no)} />
                  </div>
                </div>
                <FieldMsg msg={fieldErrors.phone_no} />
              </div>

              <div>
                <label htmlFor="password" className={lbl}>Password <span className="text-red-400">*</span></label>
                <input id="password" name="password" type="password" autoComplete="new-password"
                  value={form.password} onChange={handleChange} onBlur={handleBlur}
                  placeholder="Min 6 chars, 1 uppercase, 1 number, 1 symbol"
                  className={ic(fieldErrors.password)} />
                <FieldMsg msg={fieldErrors.password} />
              </div>

              <div>
                <label htmlFor="confirmPassword" className={lbl}>Confirm Password <span className="text-red-400">*</span></label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password"
                  value={form.confirmPassword} onChange={handleChange} onBlur={handleBlur} placeholder="Repeat password"
                  className={ic(fieldErrors.confirmPassword)} />
                <FieldMsg msg={fieldErrors.confirmPassword} />
              </div>

              {serverError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p role="alert" className="text-sm text-red-600">{serverError}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full bg-[#3b5bfc] hover:bg-[#2f4edc] disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm text-sm mt-2">
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registering...
                    </span>
                  : "Create Account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link to="/login" className="text-[#3b5bfc] font-medium hover:text-[#2f4edc] transition-colors">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
