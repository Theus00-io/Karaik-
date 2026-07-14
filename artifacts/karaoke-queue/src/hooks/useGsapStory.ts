import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function useGsapStory(root: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    if (!root.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      gsap.set(root.current.querySelectorAll("[data-reveal]"), { opacity: 1 });
      return;
    }

    const context = gsap.context(() => {
      const media = gsap.matchMedia();

      media.add("(min-width: 768px)", () => {
        gsap.from("[data-hero-copy] > *", {
          y: 28,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: "power3.out",
        });
        gsap.to("[data-hero-orbit]", {
          rotate: 16,
          yPercent: 8,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      });

      media.add("(max-width: 767px)", () => {
        gsap.from("[data-hero-copy]", {
          y: 16,
          opacity: 0,
          duration: 0.55,
          ease: "power2.out",
        });
      });

      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((element) => {
        gsap.from(element, {
          y: 24,
          opacity: 0,
          duration: 0.65,
          ease: "power2.out",
          scrollTrigger: { trigger: element, start: "top 88%", once: true },
        });
      });

      gsap.fromTo(
        "[data-signal-path]",
        { strokeDashoffset: 520 },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top 70%",
            end: "bottom 25%",
            scrub: 0.7,
          },
        },
      );

      gsap.to("[data-scroll-progress]", {
        scaleX: 1,
        ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.2 },
      });

      return () => media.revert();
    }, root);

    return () => context.revert();
  }, [root]);
}
