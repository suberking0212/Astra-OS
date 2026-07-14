"use client";
import {
  AlertCircle,
  CheckCircle2,
  LockKeyhole,
  LogIn,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { API_BASE_URL, ApiError, login, register } from "@/lib/api-client";
import { loadAnime } from "@/lib/load-anime";
import { useAuthSession } from "@/hooks/use-auth-session";
import { routes } from "@/lib/routes";

type AuthMode = "signin" | "register";
type ApiState = "checking" | "online" | "offline";

export default function LoginPage() {
  const router = useRouter();
  const { setAuthenticatedSession } = useAuthSession();
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [apiState, setApiState] = useState<ApiState>("checking");
  const modeSliderRef = useRef<HTMLSpanElement | null>(null);
  const modeTrackRef = useRef<HTMLDivElement | null>(null);
  const signInButtonRef = useRef<HTMLButtonElement | null>(null);
  const registerButtonRef = useRef<HTMLButtonElement | null>(null);
  const glowRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const modeCopy = useMemo(
    () =>
      mode === "signin"
        ? {
            title: "Sign in to AstraOS",
            caption: "Continue to the Agent Workspace with a bearer token scoped to your account.",
            action: "Sign in",
          }
        : {
            title: "Create local account",
            caption: "Register an MVP user, then enter the AI Customer Support Workspace.",
            action: "Create account",
          },
    [mode],
  );

  const apiStatusLabel =
    apiState === "online" ? "Ready" : apiState === "offline" ? "Blocked" : "Checking";
  const apiStatusClassName =
    apiState === "online"
      ? "online"
      : apiState === "offline"
        ? "offline"
        : "checking";

  useEffect(() => {
    let isMounted = true;

    async function checkApi() {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, { cache: "no-store" });
        if (isMounted) {
          setApiState(response.ok ? "online" : "offline");
        }
      } catch {
        if (isMounted) {
          setApiState("offline");
        }
      }
    }

    void checkApi();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    let isActive = true;
    let animeRef: Awaited<ReturnType<typeof loadAnime>> | null = null;
    const glowTargets = [...glowRefs.current];

    const animateGlow = async (target: HTMLSpanElement | null) => {
      if (!isActive || !target) {
        return;
      }

      const anime = animeRef ?? (animeRef = await loadAnime());
      if (!isActive) {
        return;
      }

      anime.remove(target);
      anime({
        targets: target,
        translateX: anime.random(-120, 120),
        translateY: anime.random(-90, 90),
        scale: anime.random(92, 118) / 100,
        opacity: anime.random(26, 42) / 100,
        duration: anime.random(9000, 15000),
        easing: "easeInOutSine",
        complete: () => {
          void animateGlow(target);
        },
      });
    };

    async function startGlow() {
      const anime = animeRef ?? (animeRef = await loadAnime());
      if (!isActive) {
        return;
      }

      glowTargets.forEach((target, index) => {
        if (!target) {
          return;
        }

        target.style.opacity = "0.32";
        anime.set(target, {
          translateX: 0,
          translateY: 0,
          scale: 1,
        });

        window.setTimeout(() => {
          if (isActive) {
            void animateGlow(target);
          }
        }, index * 220);
      });
    }

    void startGlow();

    return () => {
      isActive = false;
      if (animeRef) {
        const anime = animeRef;
        glowTargets.forEach((target) => {
          if (target) {
            anime.remove(target);
          }
        });
      }
    };
  }, []);

  useLayoutEffect(() => {
    let isActive = true;
    let animeRef: Awaited<ReturnType<typeof loadAnime>> | null = null;

    async function positionSlider(animateSlider: boolean) {
      const track = modeTrackRef.current;
      const slider = modeSliderRef.current;
      const target = mode === "signin" ? signInButtonRef.current : registerButtonRef.current;

      if (!track || !slider || !target) {
        return;
      }

      const nextLeft = target.offsetLeft;
      const nextWidth = target.offsetWidth;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (!animateSlider || prefersReducedMotion) {
        slider.style.transform = `translateX(${nextLeft}px)`;
        slider.style.width = `${nextWidth}px`;
        return;
      }

      const anime = animeRef ?? (animeRef = await loadAnime());
      if (!isActive) {
        return;
      }

      anime.remove(slider);
      anime({
        targets: slider,
        translateX: nextLeft,
        width: nextWidth,
        duration: 260,
        easing: "cubicBezier(0.22, 1, 0.36, 1)",
      });
    }

    void positionSlider(true);
    const handleResize = () => {
      void positionSlider(false);
    };
    window.addEventListener("resize", handleResize);
    const sliderNode = modeSliderRef.current;

    return () => {
      isActive = false;
      window.removeEventListener("resize", handleResize);
      if (animeRef && sliderNode) {
        animeRef.remove(sliderNode);
      }
    };
  }, [mode]);

  const handleSubmit: NonNullable<React.ComponentProps<"form">["onSubmit"]> = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const response =
        mode === "signin" ? await login(email, password) : await register(email, password);
      setAuthenticatedSession(response.access_token, response.user);
      setStatus("success");
      router.push(response.user.email_verified ? routes.workspace : routes.verifyEmail);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "API connection failed. Confirm the backend is running and this origin is allowed.";
      setError(message);
      setStatus("idle");
    }
  };

  return (
    <main className="auth-immersive">
      <div className="auth-ambient" aria-hidden="true">
        <span
          className="auth-ambient-glow auth-ambient-glow-a"
          ref={(node) => {
            glowRefs.current[0] = node;
          }}
        />
        <span
          className="auth-ambient-glow auth-ambient-glow-b"
          ref={(node) => {
            glowRefs.current[1] = node;
          }}
        />
        <span
          className="auth-ambient-glow auth-ambient-glow-c"
          ref={(node) => {
            glowRefs.current[2] = node;
          }}
        />
      </div>
      <div className="auth-immersive-noise" aria-hidden="true" />
      <section className="auth-stage" aria-labelledby="auth-title">
        <div className="agent-brand auth-immersive-brand" aria-label="AstraOS Workspace">
          <div className="agent-brand-mark" aria-hidden="true" />
          <div className="agent-brand-name">
            AstraOS
            <span className="agent-brand-subtitle">Workspace</span>
          </div>
        </div>

        <div className="auth-copy">
          <p className="auth-kicker">Governed access for the workspace</p>
          <h1 id="auth-title">Productivity is King.</h1>
          <p className="auth-copy-line">
            Email authentication gates owner-scoped workspaces while the new Task-first runtime is rebuilt.
          </p>
        </div>

        <section className="auth-card" aria-labelledby="login-heading">
          <div className="auth-card-header">
            <div>
              <h2 id="login-heading">{modeCopy.title}</h2>
              <p>{modeCopy.caption}</p>
            </div>
            <span className={`auth-card-status ${apiStatusClassName}`}>
              {apiStatusLabel}
            </span>
          </div>

          <div
            className="segmented auth-mode auth-mode-immersive"
            ref={modeTrackRef}
            role="tablist"
            aria-label="Authentication mode"
          >
            <span className="auth-mode-slider" ref={modeSliderRef} aria-hidden="true" />
            <button
              aria-selected={mode === "signin"}
              className={`auth-mode-option ${mode === "signin" ? "active" : ""}`}
              onClick={() => setMode("signin")}
              ref={signInButtonRef}
              role="tab"
              type="button"
            >
              <span className="auth-mode-option-content">
                <LogIn className="icon" aria-hidden="true" />
                <span>Sign in</span>
              </span>
            </button>
            <button
              aria-selected={mode === "register"}
              className={`auth-mode-option ${mode === "register" ? "active" : ""}`}
              onClick={() => setMode("register")}
              ref={registerButtonRef}
              role="tab"
              type="button"
            >
              <span className="auth-mode-option-content">
                <UserPlus className="icon" aria-hidden="true" />
                <span>Register</span>
              </span>
            </button>
          </div>

          <form className="auth-form-stack" onSubmit={handleSubmit}>
            <label className="form-field auth-field">
              <span>Email</span>
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
                type="email"
                value={email}
              />
            </label>

            <label className="form-field auth-field">
              <span>Password</span>
              <input
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type="password"
                value={password}
              />
            </label>

            {error ? (
              <div className="form-alert danger auth-alert" role="alert">
                <AlertCircle className="icon" aria-hidden="true" />
                <span>{error}</span>
              </div>
            ) : null}

            {status === "success" ? (
              <div className="form-alert success auth-alert" role="status">
                <CheckCircle2 className="icon" aria-hidden="true" />
                <span>Authenticated. Opening Workspace.</span>
              </div>
            ) : null}

            <button className="auth-submit" disabled={status === "loading"} type="submit">
              <LockKeyhole className="icon" aria-hidden="true" />
              {status === "loading" ? "Working..." : modeCopy.action}
            </button>
          </form>

          <p className="auth-footnote">
            {mode === "signin" ? (
              <>
                No local account yet?{" "}
                <button
                  className="auth-inline-link"
                  onClick={() => setMode("register")}
                  type="button"
                >
                  Register
                </button>
                .
              </>
            ) : (
              <>
                Already registered?{" "}
                <button
                  className="auth-inline-link"
                  onClick={() => setMode("signin")}
                  type="button"
                >
                  Sign in
                </button>
                .
              </>
            )}
          </p>
        </section>
      </section>
    </main>
  );
}
