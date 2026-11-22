import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import heroImage from "../../assets/hero.png";
import Nav from "../../components/home/nav.jsx";
import SiteFooter from "../../components/home/SiteFooter.jsx";
import BusinessDirectory from "../../components/home/BusinessDirectory.jsx";

gsap.registerPlugin(ScrollTrigger);

const ReactiveWaveBackground = lazy(
  () => import("../../components/home/ReactiveWaveBackground.jsx")
);

const ArrowIcon = ({ diagonal = false }) => (
  <svg
    aria-hidden="true"
    className={diagonal ? "arrow-icon arrow-icon-diagonal" : "arrow-icon"}
    viewBox="0 0 20 20"
    fill="none"
  >
    <path d="M3.5 10h12m-5-5 5 5-5 5" />
  </svg>
);

function IntroLoader() {
  return (
    <div className="intro-loader" role="status" aria-label="Loading Northstar">
      <span className="brand-mark loader-mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className="loader-wordmark">northstar</span>
      <span className="loader-caption">A better kind of business network</span>
      <span className="loader-track"><span /></span>
    </div>
  );
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(true);
  const pageRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 1050);
    return () => window.clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (isLoading || !pageRef.current) return undefined;

    const motionPreference = gsap.matchMedia();
    const resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh());
    resizeObserver.observe(pageRef.current);

    motionPreference.add("(prefers-reduced-motion: no-preference)", () => {
      const revealElements = gsap.utils.toArray(
        ".hero-copy, .hero-art, .section-heading, .directory-preview, .collab-graphic, .collab-copy, .collab-note, .register-copy, .register-art",
        pageRef.current
      );

      revealElements.forEach((element) => {
        gsap.fromTo(
          element,
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      const collabSection = pageRef.current.querySelector(".collab-section");
      const collabAtom = pageRef.current.querySelector(".collab-atom");

      if (collabSection && collabAtom) {
        const atomTimeline = gsap.timeline({
          paused: true,
          repeat: -1,
          defaults: { ease: "none" },
        }).to(collabAtom, {
          rotation: 360,
          duration: 24,
          transformOrigin: "50% 50%",
        });

        ScrollTrigger.create({
          trigger: collabSection,
          start: "top 85%",
          end: "bottom 15%",
          onEnter: () => {
            collabAtom.classList.add("is-active");
            atomTimeline.play();
          },
          onLeave: () => {
            atomTimeline.pause();
            collabAtom.classList.remove("is-active");
          },
          onEnterBack: () => {
            collabAtom.classList.add("is-active");
            atomTimeline.play();
          },
          onLeaveBack: () => {
            atomTimeline.pause();
            collabAtom.classList.remove("is-active");
          },
        });
      }
    });

    return () => {
      resizeObserver.disconnect();
      motionPreference.revert();
    };
  }, [isLoading]);

  return (
    <main className="home-page" ref={pageRef}>
      {isLoading && <IntroLoader />}
      <Nav />

      <section className="hero-section" aria-labelledby="hero-title">
        <Suspense fallback={null}>
          <ReactiveWaveBackground
            className="hero-wave"
            interactive
            intensity={0.65}
            style={{ position: "absolute", inset: 0, minHeight: 0, opacity: 0.6 }}
          />
        </Suspense>
        <div className="hero-shell">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> THE NETWORK FOR WHAT’S NEXT</div>
            <h1 id="hero-title">
              Good business
              <br />
              <span>finds its people.</span>
            </h1>
            <p className="hero-description">
              Meet the independent businesses shaping tomorrow. Find your next
              favorite, make a meaningful connection, and grow alongside people
              who get it.
            </p>
            <div className="hero-actions">
              <Link className="button button-lime" to="/businesses">
                Explore businesses <ArrowIcon />
              </Link>
              <a className="text-link hero-register-link" href="#register">
                Register your business <ArrowIcon diagonal />
              </a>
            </div>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true">
                <span>J</span><span>M</span><span>A</span><span>+</span>
              </div>
              <p><strong>2,400+</strong> founders finding their people</p>
            </div>
          </div>

          <div className="hero-art" aria-label="A preview of the Northstar business network">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-sun"><span>n.</span></div>
            <div className="float-card float-card-top">
              <span className="float-card-label">THIS WEEK’S FIND</span>
              <div className="find-card-content">
                <div className="find-card-icon">b.</div>
                <div><strong>Bloom &amp; Wild</strong><span>Floral studio · Portland</span></div>
                <span className="find-arrow">↗</span>
              </div>
            </div>
            <div className="float-card float-card-side">
              <span className="online-dot" />
              <span>Good things grow together.</span>
            </div>
            <div className="float-card float-card-bottom">
              <span className="tiny-spark">✳</span>
              <div><strong>Right where you belong.</strong><span>Independent businesses, connected.</span></div>
            </div>
            <span className="art-coordinate">45°31′12″ N<br />122°40′55″ W</span>
            <span className="art-stamp">LOCAL<br />MATTERS</span>
          </div>
        </div>
        <div className="hero-bottomline">
          <span>BUILT FOR THE BOLD, THE LOCAL &amp; THE JUST-GETTING-STARTED</span>
          <a href="#explore">Scroll to discover <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section className="ticker" aria-label="Business categories">
        <div className="ticker-track">
          <div className="ticker-group">
            <span>MADE FOR SMALL BUSINESS</span><i>✳</i><span>BUILT ON REAL CONNECTIONS</span><i>✳</i>
            <span>GROW AT YOUR OWN PACE</span><i>✳</i><span>MADE FOR SMALL BUSINESS</span><i>✳</i>
          </div>
          <div className="ticker-group" aria-hidden="true">
            <span>MADE FOR SMALL BUSINESS</span><i>✳</i><span>BUILT ON REAL CONNECTIONS</span><i>✳</i>
            <span>GROW AT YOUR OWN PACE</span><i>✳</i><span>MADE FOR SMALL BUSINESS</span><i>✳</i>
          </div>
        </div>
      </section>

      <section className="discover-section section-shell" id="explore">
        <div className="section-heading">
          <div>
            <div className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> A LITTLE LESS SCROLLING, A LOT MORE SOUL</div>
            <h2>Find your kind<br />of <span>business.</span></h2>
          </div>
          <div className="section-intro">
            <p>From neighborhood favorites to the next big thing, discover independent businesses with a story worth knowing.</p>
            <Link className="text-link dark-link" to="/businesses">
              Explore the directory <ArrowIcon />
            </Link>
          </div>
        </div>

        <BusinessDirectory />
      </section>

      <section className="collab-section" id="collaborate">
        <div className="collab-inner">
          <div className="collab-graphic" aria-hidden="true">
            <div className="collab-atom">
              <span className="collab-orbit collab-orbit-a" /><span className="collab-orbit collab-orbit-b" />
              <span className="collab-center">✳</span>
              <span className="collab-node node-one">B</span><span className="collab-node node-two">M</span><span className="collab-node node-three">+</span>
            </div>
          </div>
          <div className="collab-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> BETTER, TOGETHER</div>
            <h2>More than a<br /><span>network.</span> A ripple.</h2>
            <p>Share what you’re building. Find your next collaborator. Turn a small introduction into something bigger — because great things rarely happen alone.</p>
            <a className="button button-outline" href="#register">Find your people <ArrowIcon /></a>
          </div>
          <div className="collab-note"><span>01 — 03</span><p>Good people.<br />Good energy.<br /><strong>Good things ahead.</strong></p></div>
        </div>
      </section>

      <section className="register-section" id="register">
        <div className="register-card">
          <div className="register-sticker" aria-hidden="true">YOUR<br />NEXT<br />CHAPTER<br /><span>↘</span></div>
          <div className="register-copy">
            <div className="eyebrow eyebrow-dark"><span className="eyebrow-dot" /> YOUR BUSINESS BELONGS HERE</div>
            <h2>Put your good<br />thing <span>out there.</span></h2>
            <p>Join a growing community of independent businesses finding new customers, collaborators, and their next big idea.</p>
            <div className="register-actions">
              <Link className="button button-dark" to="/signup">Register your business <ArrowIcon /></Link>
              <span>Free to join. Built to grow.</span>
            </div>
          </div>
          <div className="register-art" aria-hidden="true">
            <img src={heroImage} alt="" />
            <span className="register-art-ring" />
            <span className="register-art-caption">INDEPENDENT<br />BY NATURE</span>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
