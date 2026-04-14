"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/AuthContext";

type Slide = {
  logo?: string;
  icon?: string;
  title: string;
  description: string;
  isFinal?: boolean;
};

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartXRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);

  const slides: Slide[] = [
    {
      logo: "Gatchi",
      title: "여행은 Gatchi와 같이",
      description: "계획부터 추억까지, 동행자와 함께하는 여행 앱",
    },
    {
      icon: "🗓️",
      title: "동행자와 함께 일정 짜기",
      description:
        "계획 단계부터 설렘을 함께 나눠요.\n동행자를 초대하고 실시간으로 일정을 공유하세요.",
    },
    {
      icon: "🔔",
      title: "여행 중 실시간 푸시 알림",
      description:
        "긴급 상황부터 소소한 순간까지,\n동행자에게 바로 알림을 보낼 수 있어요.",
    },
    {
      icon: "📸",
      title: "여행 후 추억 모아보기",
      description:
        "우리의 여행을 한 곳에 기록하고,\n소중한 순간을 함께 돌아봐요.",
    },
    {
      title: "지금 바로 첫 여행을 만들어보세요",
      description: "무료로 시작할 수 있어요",
      isFinal: true,
    },
  ];

  const lastIndex = slides.length - 1;

  const goToSlide = (index: number) => {
    const normalized = Math.max(0, Math.min(index, lastIndex));
    setCurrentSlide(normalized);
  };

  const goNext = () => {
    if (currentSlide < lastIndex) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
    touchEndXRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    touchEndXRef.current = e.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current === null || touchEndXRef.current === null) return;
    const deltaX = touchStartXRef.current - touchEndXRef.current;
    const threshold = 50;

    if (deltaX > threshold) {
      goToSlide(currentSlide + 1);
    } else if (deltaX < -threshold) {
      goToSlide(currentSlide - 1);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/trips");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-900">
        <div className="h-8 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
      </div>
    );
  }

  return (
    <div className="relative bg-white dark:bg-zinc-900">
      {currentSlide !== lastIndex && (
        <Link
          href="/login"
          className="fixed right-5 top-6 z-30 text-xs font-medium text-zinc-400"
        >
          건너뛰기
        </Link>
      )}
      <main className="mx-auto w-full max-w-md overflow-hidden bg-white dark:bg-zinc-900">
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {slides.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <section
                key={slide.title}
                className="flex min-h-screen w-full shrink-0 flex-col items-center justify-center px-6 pb-10 pt-16 text-center"
              >
                {slide.logo && (
                  <p
                    className={`text-sm font-semibold tracking-wide text-zinc-500 transition-all duration-500 dark:text-zinc-400 ${
                      isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                    style={{ transitionDelay: "0ms" }}
                  >
                    {slide.logo}
                  </p>
                )}
                {slide.icon && (
                  <p
                    className={`text-6xl leading-none transition-all duration-500 ${
                      isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                    style={{ transitionDelay: "0ms" }}
                  >
                    {slide.icon}
                  </p>
                )}
                <h1
                  className={`mt-5 whitespace-pre-line text-3xl font-semibold leading-tight text-zinc-900 transition-all duration-500 dark:text-zinc-50 ${
                    isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                  }`}
                  style={{ transitionDelay: "100ms" }}
                >
                  {slide.title}
                </h1>
                <p
                  className={`mt-4 whitespace-pre-line text-sm leading-relaxed text-zinc-600 transition-all duration-500 dark:text-zinc-300 ${
                    isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                  }`}
                  style={{ transitionDelay: "200ms" }}
                >
                  {slide.description}
                </p>

                {!slide.isFinal ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className={`mt-10 rounded-full bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition-all duration-500 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 ${
                      isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                    }`}
                    style={{ transitionDelay: "300ms" }}
                  >
                    {index === 0 ? "시작하기 →" : "다음 →"}
                  </button>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={`mt-10 rounded-full bg-zinc-900 px-8 py-3 text-sm font-semibold text-white transition-all duration-500 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 ${
                        isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                      }`}
                      style={{ transitionDelay: "300ms" }}
                    >
                      시작하기
                    </Link>
                    <p
                      className={`mt-6 text-xs text-zinc-500 transition-all duration-500 dark:text-zinc-400 ${
                        isActive ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                      }`}
                      style={{ transitionDelay: "350ms" }}
                    >
                      © 2026 Gatchi
                    </p>
                  </>
                )}
              </section>
            );
          })}
        </div>

        <div className="fixed bottom-8 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => goToSlide(idx)}
              aria-label={`${idx + 1}번 슬라이드로 이동`}
              className={`h-2.5 w-2.5 rounded-full border transition ${
                idx === currentSlide
                  ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                  : "border-zinc-400 bg-transparent dark:border-zinc-500"
              }`}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
