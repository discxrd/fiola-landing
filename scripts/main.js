(() => {
	document.documentElement.dataset.fiolaScript = "loading";

	const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	const motionMode = new URLSearchParams(window.location.search).get("motion");
	const navLinks = [...document.querySelectorAll(".header__nav-link")];
	const navTargets = navLinks
		.map((link) => {
			const id = link.getAttribute("href")?.slice(1);
			const target = id ? document.getElementById(id) : null;

			return target ? { id, link, target } : null;
		})
		.filter(Boolean);
	let navFrame = 0;
	let headerFrame = 0;
	let headerPostHeroNavVisible = false;
	let preferredNavId = "";
	let preferredNavTimer = 0;
	let lenisInstance = null;
	let lenisFrame = 0;
	let aboutScrollTrigger = null;
	let aboutScrollTween = null;
	let aboutTrackDistance = 0;
	let aboutScrollReady = false;
	let aboutMeasureFrame = 0;
	let aboutMeasureKey = "";
	let aboutRefreshFrame = 0;
	let aboutLenisResizeFrame = 0;
	let aboutImagesWarmStarted = false;
	let techStackTimeline = null;
	let techStackDriftTween = null;
	let directionsFrame = 0;
	let directionsScrollDistance = 0;
	let directionsStepDistance = 0;
	let directionsScrollReady = false;
	let directionsActiveIndex = -1;
	let advantagesCardTiltReady = false;
	let advantagesCardTiltCards = [];
	let scrollTriggerUpdateFrame = 0;
	let customCursorFrame = 0;
	let customCursorElement = null;
	let customCursorListenersReady = false;
	let customCursorIsVisible = false;
	let customCursorCurrentX = 0;
	let customCursorCurrentY = 0;
	let customCursorTargetX = 0;
	let customCursorTargetY = 0;
	let customCursorInteractiveTarget = null;
	let filmGrainFrame = 0;
	let filmGrainResizeFrame = 0;
	let filmGrainRuntime = null;
	const customCursorPointerQuery = window.matchMedia(
		"(hover: hover) and (pointer: fine)",
	);
	const customCursorInteractiveSelector = [
		"a[href]",
		"button",
		"input",
		"textarea",
		"select",
		"summary",
		'[role="button"]',
		'[role="link"]',
		'[tabindex]:not([tabindex="-1"])',
	].join(",");

	const shouldDisableSmoothScroll = () => motionMode === "reduce";
	const shouldReduceDecorativeMotion = () =>
		motionMode === "reduce" || (motionQuery.matches && motionMode !== "force");
	const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
	const lerp = (start, end, progress) => start + (end - start) * progress;
	const canUseCustomCursor = () =>
		customCursorPointerQuery.matches && !shouldReduceDecorativeMotion();
	const canUseAdvantagesCardTilt = () =>
		customCursorPointerQuery.matches && !shouldReduceDecorativeMotion();
	const aboutScrollTriggerId = "about-studio-horizontal";
	const createShader = (gl, type, source) => {
		const shader = gl.createShader(type);

		if (!shader) {
			return null;
		}

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	};
	const createFilmGrainProgram = (gl) => {
		const vertexShader = createShader(
			gl,
			gl.VERTEX_SHADER,
			"attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }",
		);
		const fragmentShader = createShader(
			gl,
			gl.FRAGMENT_SHADER,
			[
				"precision mediump float;",
				"uniform vec2 u_resolution;",
				"uniform float u_time;",
				"float random(vec2 value) {",
				"  return fract(sin(dot(value, vec2(12.9898, 78.233))) * 43758.5453123);",
				"}",
				"void main() {",
				"  vec2 uv = gl_FragCoord.xy / max(u_resolution.xy, vec2(1.0));",
				"  float grain = random(floor(uv * u_resolution * 0.72) + u_time * 58.0);",
				"  float fine = random(gl_FragCoord.xy + u_time * 131.0);",
				"  float noise = mix(grain, fine, 0.38);",
				"  float vignette = smoothstep(0.92, 0.18, distance(uv, vec2(0.5)));",
				"  float alpha = (0.035 + noise * 0.105) * vignette;",
				"  gl_FragColor = vec4(vec3(noise), alpha);",
				"}",
			].join("\n"),
		);

		if (!vertexShader || !fragmentShader) {
			return null;
		}

		const program = gl.createProgram();

		if (!program) {
			return null;
		}

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);
		gl.deleteShader(vertexShader);
		gl.deleteShader(fragmentShader);

		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			gl.deleteProgram(program);
			return null;
		}

		return program;
	};
	const stopFilmGrain = (status = "disabled") => {
		const runtime = filmGrainRuntime;

		if (filmGrainFrame !== 0) {
			window.cancelAnimationFrame(filmGrainFrame);
			filmGrainFrame = 0;
		}

		if (filmGrainResizeFrame !== 0) {
			window.cancelAnimationFrame(filmGrainResizeFrame);
			filmGrainResizeFrame = 0;
		}

		if (runtime) {
			runtime.gl.deleteBuffer(runtime.buffer);
			runtime.gl.deleteProgram(runtime.program);
		}

		filmGrainRuntime = null;
		document.documentElement.dataset.filmGrain = status;
	};
	const resizeFilmGrain = () => {
		if (!filmGrainRuntime) {
			return;
		}

		const { canvas, gl, resolutionLocation } = filmGrainRuntime;
		const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
		const width = Math.max(1, Math.floor(window.innerWidth * pixelRatio));
		const height = Math.max(1, Math.floor(window.innerHeight * pixelRatio));

		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}

		gl.viewport(0, 0, width, height);
		gl.uniform2f(resolutionLocation, width, height);
	};
	const scheduleFilmGrainResize = () => {
		if (filmGrainResizeFrame !== 0) {
			return;
		}

		filmGrainResizeFrame = window.requestAnimationFrame(() => {
			filmGrainResizeFrame = 0;
			resizeFilmGrain();
		});
	};
	const renderFilmGrain = (time) => {
		if (!filmGrainRuntime) {
			filmGrainFrame = 0;
			return;
		}

		const { gl, timeLocation } = filmGrainRuntime;

		gl.uniform1f(timeLocation, time * 0.001);
		gl.drawArrays(gl.TRIANGLES, 0, 6);
		filmGrainFrame = window.requestAnimationFrame(renderFilmGrain);
	};
	const initFilmGrain = () => {
		const canvas = document.querySelector(".film-grain");

		if (!(canvas instanceof HTMLCanvasElement)) {
			stopFilmGrain("missing-canvas");
			return;
		}

		if (shouldReduceDecorativeMotion()) {
			stopFilmGrain("disabled");
			return;
		}

		if (filmGrainRuntime) {
			document.documentElement.dataset.filmGrain = "ready";
			resizeFilmGrain();

			if (filmGrainFrame === 0) {
				filmGrainFrame = window.requestAnimationFrame(renderFilmGrain);
			}

			return;
		}

		const gl = canvas.getContext("webgl", {
			alpha: true,
			antialias: false,
			depth: false,
			premultipliedAlpha: true,
			preserveDrawingBuffer: false,
			stencil: false,
		});

		if (!gl) {
			stopFilmGrain("unsupported");
			return;
		}

		const program = createFilmGrainProgram(gl);

		if (!program) {
			stopFilmGrain("unsupported");
			return;
		}

		const positionLocation = gl.getAttribLocation(program, "a_position");
		const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
		const timeLocation = gl.getUniformLocation(program, "u_time");
		const buffer = gl.createBuffer();

		if (
			positionLocation < 0 ||
			!resolutionLocation ||
			!timeLocation ||
			!buffer
		) {
			stopFilmGrain("unsupported");
			return;
		}

		gl.useProgram(program);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
			gl.STATIC_DRAW,
		);
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.STENCIL_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		filmGrainRuntime = {
			buffer,
			canvas,
			gl,
			program,
			resolutionLocation,
			timeLocation,
		};
		document.documentElement.dataset.filmGrain = "ready";
		resizeFilmGrain();

		if (filmGrainFrame === 0) {
			filmGrainFrame = window.requestAnimationFrame(renderFilmGrain);
		}
	};
	const registerScrollTrigger = () => {
		const gsapInstance = window.gsap;
		const scrollTrigger = window.ScrollTrigger;

		if (!gsapInstance || !scrollTrigger) {
			return null;
		}

		gsapInstance.registerPlugin(scrollTrigger);
		return scrollTrigger;
	};
	const scheduleScrollTriggerUpdate = () => {
		if (scrollTriggerUpdateFrame !== 0) {
			return;
		}

		scrollTriggerUpdateFrame = window.requestAnimationFrame(() => {
			scrollTriggerUpdateFrame = 0;
			window.ScrollTrigger?.update?.();
		});
	};
	const scheduleLenisResize = () => {
		if (aboutLenisResizeFrame !== 0) {
			return;
		}

		aboutLenisResizeFrame = window.requestAnimationFrame(() => {
			aboutLenisResizeFrame = 0;
			lenisInstance?.resize?.();
		});
	};
	const scheduleAboutScrollRefresh = () => {
		if (aboutRefreshFrame !== 0) {
			return;
		}

		aboutRefreshFrame = window.requestAnimationFrame(() => {
			aboutRefreshFrame = 0;
			if (
				window.scrollY > 4 &&
				aboutScrollTrigger &&
				!aboutScrollTrigger.killed
			) {
				scheduleLenisResize();
				scheduleScrollTriggerUpdate();
				return;
			}

			window.ScrollTrigger?.refresh?.();
			scheduleLenisResize();
		});
	};
	const getClampedViewportValue = (min, viewportRatio, max) =>
		clamp(window.innerWidth * viewportRatio, min, max);
	const getHeroHeaderTop = () => getClampedViewportValue(24, 0.02083, 40);
	const getFixedHeaderTop = () => getClampedViewportValue(12, 0.018, 24);
	const getHeaderDockScrollY = () =>
		Math.max(0, getHeroHeaderTop() - getFixedHeaderTop());
	const isHeroFullyOutOfView = () => {
		const hero = document.querySelector(".foundation--hero");

		return hero ? hero.getBoundingClientRect().bottom <= 0 : false;
	};
	const isHeaderDockedWithHeroNav = () =>
		window.scrollY <= getHeaderDockScrollY() + 1;

	if (motionMode === "reduce" || motionMode === "force") {
		document.documentElement.dataset.motionOverride = motionMode;
	}

	if (motionQuery.matches) {
		document.documentElement.dataset.motionPreference = "reduce";
	}

	const setActiveNavLink = (activeId) => {
		for (const { id, link } of navTargets) {
			const isActive = id === activeId;

			link.classList.toggle("header__nav-link--active", isActive);
			if (isActive) {
				link.setAttribute("aria-current", "location");
			} else {
				link.removeAttribute("aria-current");
			}
		}
	};

	const getCurrentNavId = () => {
		if (preferredNavId) {
			return preferredNavId;
		}

		const hashId = window.location.hash.slice(1);
		const hashTarget = hashId ? document.getElementById(hashId) : null;
		const hashMatchesNav = navTargets.some(({ id }) => id === hashId);

		if (hashTarget && hashMatchesNav) {
			const hashTop = hashTarget.getBoundingClientRect().top;
			const activeZone = Math.max(240, window.innerHeight * 0.8);

			if (hashTop >= -8 && hashTop <= activeZone) {
				return hashId;
			}
		}

		const bottomEdge =
			document.documentElement.scrollHeight - window.innerHeight - 2;

		if (window.scrollY >= bottomEdge) {
			return navTargets[navTargets.length - 1]?.id;
		}

		const activeLine =
			window.scrollY + Math.min(window.innerHeight * 0.16, 140);
		let currentId = navTargets[0]?.id;

		for (const { id, target } of navTargets) {
			const targetTop = target.getBoundingClientRect().top + window.scrollY;

			if (targetTop <= activeLine) {
				currentId = id;
			}
		}

		return currentId;
	};

	const updateActiveNavFromScroll = () => {
		const currentId = getCurrentNavId();

		if (currentId) {
			setActiveNavLink(currentId);
		}
	};

	const scheduleActiveNavUpdate = () => {
		if (navFrame !== 0) {
			return;
		}

		navFrame = window.requestAnimationFrame(() => {
			navFrame = 0;
			updateActiveNavFromScroll();
		});
	};

	const updateHeaderHeroState = () => {
		if (isHeroFullyOutOfView()) {
			headerPostHeroNavVisible = true;
		} else if (headerPostHeroNavVisible && isHeaderDockedWithHeroNav()) {
			headerPostHeroNavVisible = false;
		}

		document.documentElement.classList.toggle(
			"page--post-hero-nav",
			headerPostHeroNavVisible,
		);
		document.documentElement.dataset.headerState = headerPostHeroNavVisible
			? "post-hero"
			: "hero";
	};

	const scheduleHeaderHeroStateUpdate = () => {
		if (headerFrame !== 0) {
			return;
		}

		headerFrame = window.requestAnimationFrame(() => {
			headerFrame = 0;
			updateHeaderHeroState();
		});
	};

	const schedulePreferredNavReset = () => {
		if (preferredNavTimer !== 0) {
			window.clearTimeout(preferredNavTimer);
		}

		preferredNavTimer = window.setTimeout(() => {
			preferredNavId = "";
			preferredNavTimer = 0;
			scheduleActiveNavUpdate();
		}, 1400);
	};

	const killAboutScrollTrigger = () => {
		const scrollTrigger = window.ScrollTrigger;

		for (const trigger of scrollTrigger?.getAll?.() || []) {
			if (
				trigger.vars?.id === aboutScrollTriggerId ||
				trigger.id === aboutScrollTriggerId
			) {
				trigger.kill(true);
			}
		}

		aboutScrollTween?.kill?.();
		aboutScrollTrigger = null;
		aboutScrollTween = null;
	};

	const cleanupAboutPinSpacers = (section) => {
		let parent = section.parentElement;

		while (
			parent instanceof HTMLElement &&
			parent.classList.contains("pin-spacer-about-studio-horizontal")
		) {
			const spacer = parent;
			const grandParent = spacer.parentNode;

			if (!grandParent) {
				break;
			}

			grandParent.insertBefore(section, spacer);
			spacer.remove();
			parent = section.parentElement;
		}

		for (const spacer of document.querySelectorAll(
			".pin-spacer-about-studio-horizontal",
		)) {
			if (!spacer.contains(section) || spacer.childElementCount === 0) {
				spacer.remove();
			}
		}
	};

	const getAboutFallbackMode = () =>
		window.matchMedia("(min-width: 821px)").matches ? "native" : "stack";
	const scheduleAboutPinnedScrollMeasure = () => {
		if (aboutMeasureFrame !== 0) {
			return;
		}

		aboutMeasureFrame = window.requestAnimationFrame(() => {
			aboutMeasureFrame = 0;
			measureAboutPinnedScroll();
		});
	};
	const warmAboutStudioImages = () => {
		if (aboutImagesWarmStarted) {
			return;
		}

		aboutImagesWarmStarted = true;
		document.documentElement.dataset.aboutImagesWarm = "scheduled";

		const warmImages = () => {
			document.documentElement.dataset.aboutImagesWarm = "warming";

			for (const image of document.querySelectorAll(
				".about-studio__card-image",
			)) {
				if (!(image instanceof HTMLImageElement)) {
					continue;
				}

				const source = image.currentSrc || image.src;

				if (!source) {
					continue;
				}

				const warmImage = image.complete ? image : new Image();

				if (warmImage !== image) {
					warmImage.decoding = "async";
					warmImage.loading = "eager";
					warmImage.src = source;
				}

				warmImage.decode?.()?.catch(() => {
					document.documentElement.dataset.aboutImagesWarm = "partial";
				});
			}
		};

		if (typeof window.requestIdleCallback === "function") {
			window.requestIdleCallback(warmImages, { timeout: 1800 });
			return;
		}

		window.setTimeout(warmImages, 700);
	};
	const updateAboutCardFocus = (section) => {
		const isPinned = section.dataset.aboutStudioMode === "gsap";
		const viewportPadding = Math.min(96, window.innerWidth * 0.08);

		for (const link of section.querySelectorAll(".about-studio__card-link")) {
			const card = link.closest(".about-studio__card");

			if (!isPinned || !(card instanceof HTMLElement)) {
				link.removeAttribute("tabindex");
				continue;
			}

			const rect = card.getBoundingClientRect();
			const isVisible =
				rect.right > viewportPadding &&
				rect.left < window.innerWidth - viewportPadding;

			if (isVisible) {
				link.removeAttribute("tabindex");
			} else {
				link.setAttribute("tabindex", "-1");
			}
		}
	};
	const resetAboutPinnedScroll = (section, reason = "disabled") => {
		const motion = section.querySelector(".about-studio__motion");
		const textGroup = section.querySelector(".about-studio__text-group");
		const cardsViewport = section.querySelector(
			".about-studio__cards-viewport",
		);
		const fallbackMode = getAboutFallbackMode();

		killAboutScrollTrigger();
		cleanupAboutPinSpacers(section);
		aboutScrollReady = false;
		aboutTrackDistance = 0;
		section.dataset.aboutStudioMode = fallbackMode;
		section.dataset.aboutStudioFallback = reason;
		section.style.removeProperty("--about-scroll-distance");
		section.style.setProperty("--about-track-shift", "0px");
		section.style.setProperty("--about-track-progress", "0");
		if (motion) {
			window.gsap?.set?.(motion, { clearProps: "transform" });
			motion.style.removeProperty("transform");
		}
		if (textGroup) {
			window.gsap?.set?.(textGroup, { clearProps: "transform,opacity" });
			textGroup.style.removeProperty("transform");
			textGroup.style.removeProperty("opacity");
		}
		if (cardsViewport) {
			window.gsap?.set?.(cardsViewport, { clearProps: "transform" });
			cardsViewport.style.removeProperty("transform");
		}
		updateAboutCardFocus(section);
		document.documentElement.dataset.aboutScrollPinned = fallbackMode;
		document.documentElement.dataset.aboutScrollFallback = reason;
	};

	function measureAboutPinnedScroll() {
		const section = document.querySelector(".about-studio");
		const motion = section?.querySelector(".about-studio__motion");
		const textGroup = section?.querySelector(".about-studio__text-group");
		const cardsViewport = section?.querySelector(
			".about-studio__cards-viewport",
		);
		const lastCard = section?.querySelector(".about-studio__card:last-child");
		const gsapInstance = window.gsap;
		const scrollTrigger = registerScrollTrigger();

		if (!section || !motion || !cardsViewport || !lastCard) {
			return;
		}

		let fallbackReason = "";

		if (!gsapInstance || !scrollTrigger) {
			fallbackReason = "gsap-missing";
		} else if (!window.matchMedia("(min-width: 1101px)").matches) {
			fallbackReason = "narrow-viewport";
		} else if (shouldReduceDecorativeMotion()) {
			fallbackReason = "reduced-motion";
		}

		if (fallbackReason) {
			aboutMeasureKey = `${fallbackReason}:${getAboutFallbackMode()}:${window.innerWidth}`;
			resetAboutPinnedScroll(section, fallbackReason);
			scheduleLenisResize();
			return;
		}

		const currentMotionX =
			Number.parseFloat(gsapInstance.getProperty(motion, "x")) || 0;
		const cardsViewportRect = cardsViewport.getBoundingClientRect();
		const cardsViewportBaseLeft = cardsViewportRect.left - currentMotionX;
		const lastCardWidth =
			lastCard instanceof HTMLElement
				? lastCard.offsetWidth
				: lastCard.getBoundingClientRect().width;
		const lastCardOffset =
			lastCard instanceof HTMLElement
				? lastCard.offsetLeft
				: lastCard.getBoundingClientRect().left - cardsViewportRect.left;
		const lastCardCenter =
			cardsViewportBaseLeft + lastCardOffset + lastCardWidth / 2;
		const targetShift = Math.min(0, window.innerWidth / 2 - lastCardCenter);
		const trackShift = Math.round(targetShift);
		const horizontalShift = Math.abs(targetShift);
		const distance = Math.max(
			window.innerHeight * 0.9,
			Math.min(horizontalShift * 0.44, window.innerHeight * 1.18),
		);
		const nextTrackDistance = Math.round(distance);
		const nextMeasureKey = [
			"gsap",
			window.innerWidth,
			window.innerHeight,
			Math.round(cardsViewportBaseLeft),
			Math.round(lastCardOffset),
			Math.round(lastCardWidth),
			trackShift,
			nextTrackDistance,
		].join(":");

		if (
			aboutMeasureKey === nextMeasureKey &&
			aboutScrollTrigger &&
			!aboutScrollTrigger.killed
		) {
			updateAboutCardFocus(section);
			scheduleScrollTriggerUpdate();
			return;
		}

		killAboutScrollTrigger();
		cleanupAboutPinSpacers(section);
		gsapInstance.set(motion, { x: 0 });
		if (textGroup) {
			gsapInstance.set(textGroup, { opacity: 1, x: 0 });
		}
		gsapInstance.set(cardsViewport, { x: 0 });
		section.style.setProperty("--about-track-progress", "0");

		aboutScrollReady = true;
		aboutTrackDistance = nextTrackDistance;
		aboutMeasureKey = nextMeasureKey;
		section.dataset.aboutStudioMode = "gsap";
		section.dataset.aboutStudioFallback = "none";
		updateAboutCardFocus(section);
		section.style.setProperty(
			"--about-scroll-distance",
			`${aboutTrackDistance}px`,
		);
		section.style.setProperty("--about-track-shift", `${trackShift}px`);

		aboutScrollTween = gsapInstance.timeline({
			ease: "none",
			scrollTrigger: {
				id: aboutScrollTriggerId,
				trigger: section,
				start: "top 8%",
				end: `+=${aboutTrackDistance}`,
				pin: true,
				anticipatePin: 0,
				invalidateOnRefresh: true,
				scrub: true,
				onUpdate: (self) => {
					section.style.setProperty(
						"--about-track-progress",
						self.progress.toFixed(4),
					);
					updateAboutCardFocus(section);
				},
			},
		});
		aboutScrollTween.to(motion, { x: trackShift, ease: "none" }, 0);
		if (textGroup) {
			aboutScrollTween.to(textGroup, { x: -trackShift, ease: "none" }, 0);
			aboutScrollTween.to(
				textGroup,
				{ opacity: 0, duration: 0.18, ease: "none" },
				0,
			);
		}
		aboutScrollTrigger = aboutScrollTween.scrollTrigger || null;
		document.documentElement.dataset.aboutScrollPinned = "gsap";
		document.documentElement.dataset.aboutScrollFallback = "none";
		scheduleAboutScrollRefresh();
	}

	const initAboutPinnedScroll = () => {
		scheduleAboutPinnedScrollMeasure();
		warmAboutStudioImages();

		if (document.fonts?.ready) {
			document.fonts.ready
				.then(scheduleAboutPinnedScrollMeasure)
				.catch(() => {});
		}

		for (const image of document.querySelectorAll(
			".about-studio__card-image",
		)) {
			if (image instanceof HTMLImageElement && !image.complete) {
				image.addEventListener("load", scheduleAboutPinnedScrollMeasure, {
					once: true,
				});
			}
		}
	};

	const resetDirectionsPinnedScroll = (section) => {
		const viewport = section.querySelector(".service-directions__viewport");
		const track = section.querySelector(".service-directions__track");

		directionsScrollReady = false;
		directionsScrollDistance = 0;
		directionsStepDistance = 0;
		directionsActiveIndex = -1;
		section.style.setProperty("--directions-scroll-distance", "0px");
		section.style.setProperty("--directions-track-shift", "0px");
		section.style.setProperty("--directions-track-progress", "0");
		section.style.setProperty("--directions-intro-progress", "0");
		section.style.setProperty("--directions-intro-scale", "0.3754");
		section.style.setProperty("--directions-intro-fill-alpha", "1");
		section.style.setProperty("--directions-intro-stroke-alpha", "0");
		section.style.setProperty("--directions-intro-stroke-width", "0px");
		section.style.setProperty("--directions-intro-weight", "200");
		section.style.setProperty("--directions-text-y", "0px");
		section.style.setProperty("--directions-scrollbar-progress", "0");
		section.style.setProperty("--directions-scrollbar-y", "0px");
		section.style.setProperty("--directions-scrollbar-height", "40px");
		section.style.setProperty(
			"--directions-scrollbar-slot-0",
			"var(--directions-scrollbar-active-height)",
		);
		for (let slotIndex = 1; slotIndex < 6; slotIndex += 1) {
			section.style.setProperty(
				`--directions-scrollbar-slot-${slotIndex}`,
				"var(--directions-scrollbar-inactive-height)",
			);
		}
		section.style.removeProperty("--directions-intro-height");
		viewport?.style.removeProperty("block-size");
		track?.style.removeProperty("block-size");

		const cards = [...section.querySelectorAll("[data-direction-card]")];

		cards.forEach((card, cardIndex) => {
			card.style.removeProperty("--directions-card-y");
			card.style.removeProperty("--directions-card-opacity");
			card.style.removeProperty("--directions-card-width");
			card.style.removeProperty("--directions-card-height");
			card.style.removeProperty("--directions-card-scale");
			card.style.removeProperty("--directions-card-columns");
			card.style.removeProperty("--directions-card-z");
			delete card.dataset.directionQueueHidden;

			if (cardIndex === 0) {
				card.setAttribute("aria-current", "step");
			} else {
				card.removeAttribute("aria-current");
			}
		});

		updateDirectionsScrollbarSlots(section, 0);

		document.documentElement.dataset.directionsScrollPinned = "disabled";
	};

	const resetTechStackAnimations = (section, status = "disabled") => {
		techStackTimeline?.kill?.();
		techStackDriftTween?.kill?.();
		techStackTimeline = null;
		techStackDriftTween = null;

		const rows = [...section.querySelectorAll(".tech-stack__row")];
		const items = [...section.querySelectorAll(".tech-stack__item")];

		window.gsap?.set?.([section, ...rows, ...items], {
			clearProps: "opacity,transform,backgroundPosition",
		});
		section.style.removeProperty("--tech-stack-glow-opacity");
		section.style.removeProperty("--tech-stack-glow-scale");
		section.style.removeProperty("--tech-stack-glow-x");
		section.style.removeProperty("--tech-stack-glow-y");
		section.dataset.techStackMotion = status;
	};

	const initTechStackAnimations = () => {
		const section = document.querySelector(".tech-stack");
		const gsapInstance = window.gsap;
		const scrollTrigger = registerScrollTrigger();

		if (!section) {
			return;
		}

		if (!gsapInstance || !scrollTrigger) {
			resetTechStackAnimations(section, "gsap-missing");
			return;
		}

		if (shouldReduceDecorativeMotion()) {
			resetTechStackAnimations(section, "reduced-motion");
			return;
		}

		const rows = [...section.querySelectorAll(".tech-stack__row")];
		const items = [...section.querySelectorAll(".tech-stack__item")];

		if (rows.length === 0 || items.length === 0) {
			resetTechStackAnimations(section, "missing-content");
			return;
		}

		resetTechStackAnimations(section, "initializing");
		section.dataset.techStackMotion = "ready";

		gsapInstance.set(section, {
			backgroundPosition: "0px 0px, 0px 0px, 0px 0px",
		});
		gsapInstance.set(rows, { y: 0 });
		gsapInstance.set(items, { opacity: 0, y: 12, scale: 0.985 });
		section.style.setProperty("--tech-stack-glow-opacity", "0.68");
		section.style.setProperty("--tech-stack-glow-scale", "0.97");

		techStackTimeline = gsapInstance.timeline({
			onComplete: () => {
				gsapInstance.set(items, { clearProps: "transform" });
			},
			scrollTrigger: {
				id: "tech-stack-motion",
				trigger: section,
				start: "top 82%",
				onEnter: () => {
					section.dataset.techStackMotion = "entered";
				},
				onLeaveBack: () => {
					section.dataset.techStackMotion = "ready";
				},
				toggleActions: "play none none reverse",
			},
		});

		techStackTimeline
			.to(
				section,
				{
					"--tech-stack-glow-opacity": 0.9,
					"--tech-stack-glow-scale": 1,
					backgroundPosition: "0px 0px, 18px 8px, 0px 0px",
					duration: 1.15,
					ease: "power2.out",
				},
				0,
			)
			.to(
				items,
				{
					opacity: 1,
					y: 0,
					scale: 1,
					duration: 0.72,
					ease: "power2.out",
					stagger: { amount: 0.46, from: "center" },
				},
				0.12,
			);

		rows.forEach((row, rowIndex) => {
			techStackTimeline?.to(
				row,
				{
					y: rowIndex === 1 ? -4 : 4,
					duration: 1.2,
					ease: "none",
				},
				0,
			);
		});

		techStackDriftTween = gsapInstance.to(section, {
			"--tech-stack-glow-x": "18px",
			"--tech-stack-glow-y": "-8px",
			ease: "none",
			scrollTrigger: {
				id: "tech-stack-drift",
				trigger: section,
				start: "top bottom",
				end: "bottom top",
				scrub: 1.2,
			},
		});
	};

	const getDirectionsSlotMetrics = (slot) => {
		const activeSlot = {
			y: 0,
			width: 1280,
			height: 421,
			scale: 1,
			opacity: 1,
			leftColumn: 532,
			rightColumn: 748,
		};
		const nextSlot = {
			y: 481,
			width: 1280,
			height: 380,
			scale: 0.9,
			opacity: 0.34,
			leftColumn: 605,
			rightColumn: 675,
		};
		const queuedSlot = {
			y: 921,
			width: 1158,
			height: 380,
			scale: 0.9,
			opacity: 0.34,
			leftColumn: 483,
			rightColumn: 675,
		};
		const previousSlot = {
			...activeSlot,
			y: -481,
			scale: 0.9,
			opacity: 0,
		};
		const mixMetrics = (start, end, progress) => ({
			y: lerp(start.y, end.y, progress),
			width: lerp(start.width, end.width, progress),
			height: lerp(start.height, end.height, progress),
			scale: lerp(start.scale, end.scale, progress),
			opacity: lerp(start.opacity, end.opacity, progress),
			leftColumn: lerp(start.leftColumn, end.leftColumn, progress),
			rightColumn: lerp(start.rightColumn, end.rightColumn, progress),
		});

		if (slot <= -1) {
			return { ...previousSlot, hidden: true };
		}

		if (slot < 0) {
			return mixMetrics(previousSlot, activeSlot, slot + 1);
		}

		if (slot < 1) {
			return mixMetrics(activeSlot, nextSlot, slot);
		}

		if (slot < 2) {
			return mixMetrics(nextSlot, queuedSlot, slot - 1);
		}

		return {
			...queuedSlot,
			y: queuedSlot.y + (slot - 2) * 440,
		};
	};

	const updateDirectionsCardQueue = (cards, rawIndex) => {
		cards.forEach((card, cardIndex) => {
			const slot = cardIndex - rawIndex;
			const metrics = getDirectionsSlotMetrics(slot);

			card.style.setProperty(
				"--directions-card-y",
				`${metrics.y.toFixed(2)}px`,
			);
			card.style.setProperty(
				"--directions-card-opacity",
				metrics.opacity.toFixed(4),
			);
			card.style.setProperty(
				"--directions-card-width",
				`${metrics.width.toFixed(2)}px`,
			);
			card.style.setProperty(
				"--directions-card-height",
				`${metrics.height.toFixed(2)}px`,
			);
			card.style.setProperty(
				"--directions-card-scale",
				metrics.scale.toFixed(4),
			);
			card.style.setProperty(
				"--directions-card-columns",
				`minmax(0, ${metrics.leftColumn.toFixed(2)}fr) minmax(0, ${metrics.rightColumn.toFixed(2)}fr)`,
			);
			card.style.setProperty(
				"--directions-card-z",
				Math.round(1000 - Math.abs(slot) * 10).toString(),
			);

			if (metrics.hidden) {
				card.dataset.directionQueueHidden = "true";
			} else {
				delete card.dataset.directionQueueHidden;
			}
		});
	};

	const getDirectionsScrollbarOffset = (index) => index * 28;
	const getDirectionsScrollbarHeight = () => 40;

	const updateDirectionsScrollbarSlots = (section, index) => {
		const slots = [
			...section.querySelectorAll(".service-directions__scrollbar-slot"),
		];

		slots.forEach((slot, slotIndex) => {
			if (slotIndex === index) {
				slot.dataset.directionScrollbarCurrent = "true";
			} else {
				delete slot.dataset.directionScrollbarCurrent;
			}

			section.style.setProperty(
				`--directions-scrollbar-slot-${slotIndex}`,
				slotIndex === index
					? "var(--directions-scrollbar-active-height)"
					: "var(--directions-scrollbar-inactive-height)",
			);
		});
	};

	const setDirectionsActiveCard = (section, index, cards) => {
		if (index === directionsActiveIndex) {
			return;
		}

		directionsActiveIndex = index;
		cards.forEach((card, cardIndex) => {
			if (cardIndex === index) {
				card.setAttribute("aria-current", "step");
			} else {
				card.removeAttribute("aria-current");
			}
		});
		updateDirectionsScrollbarSlots(section, index);
	};

	const updateDirectionsScrollProgress = () => {
		const section = document.querySelector(".service-directions");
		const intro = section?.querySelector(".service-directions__intro");

		if (section && intro) {
			const introTop = intro.getBoundingClientRect().top + window.scrollY;
			const introScrollable = Math.max(
				intro.offsetHeight - window.innerHeight,
				1,
			);
			const introProgress = clamp(
				(window.scrollY - introTop) / introScrollable,
				0,
				1,
			);
			const acceleratedIntroProgress = clamp(introProgress * 1.2, 0, 1);
			const introScale = lerp(0.3754, 1, acceleratedIntroProgress);
			const outlinePhase = clamp(
				1 - Math.abs(acceleratedIntroProgress - 0.5) * 2,
				0,
				1,
			);
			const fillAlpha = clamp(
				1 -
					outlinePhase * 0.98 +
					clamp((acceleratedIntroProgress - 0.68) / 0.32, 0, 1),
				0.02,
				1,
			);
			const strokeAlpha = outlinePhase;
			const strokeWidth = outlinePhase;
			const introWeight = Math.round(lerp(200, 300, acceleratedIntroProgress));

			section.style.setProperty(
				"--directions-intro-progress",
				acceleratedIntroProgress.toFixed(4),
			);
			section.style.setProperty(
				"--directions-intro-scale",
				introScale.toFixed(4),
			);
			section.style.setProperty(
				"--directions-intro-fill-alpha",
				fillAlpha.toFixed(4),
			);
			section.style.setProperty(
				"--directions-intro-stroke-alpha",
				strokeAlpha.toFixed(4),
			);
			section.style.setProperty(
				"--directions-intro-stroke-width",
				`${strokeWidth.toFixed(3)}px`,
			);
			section.style.setProperty(
				"--directions-intro-weight",
				introWeight.toString(),
			);
		}

		if (!directionsScrollReady || directionsScrollDistance <= 0) {
			return;
		}

		const panel = section?.querySelector(".service-directions__panel");
		const track = section?.querySelector(".service-directions__track");
		const viewport = section?.querySelector(".service-directions__viewport");
		const cards = section
			? [...section.querySelectorAll("[data-direction-card]")]
			: [];

		if (!section || !panel || !track || !viewport || cards.length === 0) {
			return;
		}

		const introHeight = parseFloat(
			getComputedStyle(section).getPropertyValue("--directions-intro-height"),
		);
		const scrollStart =
			section.getBoundingClientRect().top +
			window.scrollY +
			(Number.isFinite(introHeight) ? introHeight : 0);
		const distance = clamp(
			window.scrollY - scrollStart,
			0,
			directionsScrollDistance,
		);
		const progress = clamp(distance / directionsScrollDistance, 0, 1);
		const maxIndex = cards.length - 1;
		const rawIndex = progress * maxIndex;
		const lowerIndex = Math.floor(rawIndex);
		const upperIndex = Math.min(Math.ceil(rawIndex), maxIndex);
		const indexProgress = rawIndex - lowerIndex;
		const nextIndex = clamp(Math.round(rawIndex), 0, maxIndex);
		const shift = 0;
		const textY = 0;
		const scrollbarY = lerp(
			getDirectionsScrollbarOffset(lowerIndex),
			getDirectionsScrollbarOffset(upperIndex),
			indexProgress,
		);
		const scrollbarHeight = lerp(
			getDirectionsScrollbarHeight(lowerIndex),
			getDirectionsScrollbarHeight(upperIndex),
			indexProgress,
		);

		section.style.setProperty(
			"--directions-track-progress",
			progress.toFixed(4),
		);
		section.style.setProperty("--directions-track-shift", `${shift}px`);
		section.style.setProperty("--directions-text-y", `${textY.toFixed(2)}px`);
		section.style.setProperty(
			"--directions-scrollbar-progress",
			progress.toFixed(4),
		);
		section.style.setProperty(
			"--directions-scrollbar-y",
			`${scrollbarY.toFixed(2)}px`,
		);
		section.style.setProperty(
			"--directions-scrollbar-height",
			`${scrollbarHeight.toFixed(2)}px`,
		);
		updateDirectionsCardQueue(cards, rawIndex);
		setDirectionsActiveCard(section, nextIndex, cards);
	};

	const scheduleDirectionsScrollProgress = () => {
		if (directionsFrame !== 0) {
			return;
		}

		directionsFrame = window.requestAnimationFrame(() => {
			directionsFrame = 0;
			updateDirectionsScrollProgress();
		});
	};

	function measureDirectionsPinnedScroll() {
		const section = document.querySelector(".service-directions");
		const intro = section?.querySelector(".service-directions__intro");
		const viewport = section?.querySelector(".service-directions__viewport");
		const cards = section
			? [...section.querySelectorAll("[data-direction-card]")]
			: [];

		if (!section || !viewport || cards.length === 0) {
			return;
		}

		if (
			!window.matchMedia("(min-width: 1101px)").matches ||
			shouldReduceDecorativeMotion()
		) {
			resetDirectionsPinnedScroll(section);
			lenisInstance?.resize?.();
			return;
		}

		const firstCard = cards[0];
		const measuredItem =
			cards.find((card) => card.getAttribute("aria-current") === "step") ||
			firstCard;
		const measuredCard = measuredItem?.querySelector(
			".service-directions__card",
		);
		const hadMeasuredCurrent =
			measuredItem?.getAttribute("aria-current") === "step";
		const previousPinnedState =
			document.documentElement.dataset.directionsScrollPinned;

		document.documentElement.dataset.directionsScrollPinned = "ready";
		measuredItem?.setAttribute("aria-current", "step");

		const viewportHeight =
			measuredCard instanceof HTMLElement
				? Math.round(measuredCard.getBoundingClientRect().height)
				: 421;

		if (!hadMeasuredCurrent) {
			measuredItem?.removeAttribute("aria-current");
		}

		if (previousPinnedState) {
			document.documentElement.dataset.directionsScrollPinned =
				previousPinnedState;
		} else {
			delete document.documentElement.dataset.directionsScrollPinned;
		}
		const stepDistance = Math.round(Math.max(window.innerHeight * 0.72, 520));

		directionsStepDistance = stepDistance;
		directionsScrollDistance = stepDistance * Math.max(cards.length - 1, 1);
		directionsScrollReady = true;
		section.style.setProperty(
			"--directions-intro-height",
			`${Math.round(intro?.getBoundingClientRect().height || window.innerHeight)}px`,
		);
		viewport.style.blockSize = `${viewportHeight}px`;
		const track = section.querySelector(".service-directions__track");
		track?.style.setProperty("block-size", `${viewportHeight}px`);
		section.style.setProperty("--directions-card-peek", "0px");
		section.style.setProperty(
			"--directions-scroll-distance",
			`${directionsScrollDistance}px`,
		);
		document.documentElement.dataset.directionsScrollPinned = "ready";
		lenisInstance?.resize?.();
		updateDirectionsScrollProgress();
	}

	const initDirectionsPinnedScroll = () => {
		measureDirectionsPinnedScroll();

		if (document.fonts?.ready) {
			document.fonts.ready.then(measureDirectionsPinnedScroll).catch(() => {});
		}

		for (const image of document.querySelectorAll(
			".service-directions__image",
		)) {
			if (image instanceof HTMLImageElement && !image.complete) {
				image.addEventListener("load", measureDirectionsPinnedScroll, {
					once: true,
				});
			}
		}
	};

	const resetAdvantagesCardTilt = (card) => {
		card.style.removeProperty("--advantages-card-rotate-x");
		card.style.removeProperty("--advantages-card-rotate-y");
	};

	const handleAdvantagesCardTiltMove = (event) => {
		const card = event.currentTarget;

		if (!(card instanceof HTMLElement)) {
			return;
		}

		const rect = card.getBoundingClientRect();
		const x = (event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5;
		const y = (event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5;
		const rotateLimit = 7;

		card.style.setProperty(
			"--advantages-card-rotate-x",
			`${(-y * rotateLimit).toFixed(2)}deg`,
		);
		card.style.setProperty(
			"--advantages-card-rotate-y",
			`${(x * rotateLimit).toFixed(2)}deg`,
		);
	};

	const handleAdvantagesCardTiltLeave = (event) => {
		const card = event.currentTarget;

		if (card instanceof HTMLElement) {
			resetAdvantagesCardTilt(card);
		}
	};

	const removeAdvantagesCardTiltListeners = () => {
		if (!advantagesCardTiltReady) {
			return;
		}

		advantagesCardTiltCards.forEach((card) => {
			card.removeEventListener("pointermove", handleAdvantagesCardTiltMove);
			card.removeEventListener("pointerleave", handleAdvantagesCardTiltLeave);
			card.removeEventListener("pointercancel", handleAdvantagesCardTiltLeave);
			resetAdvantagesCardTilt(card);
		});
		advantagesCardTiltCards = [];
		advantagesCardTiltReady = false;
	};

	const initAdvantagesCardTilt = () => {
		if (!canUseAdvantagesCardTilt()) {
			removeAdvantagesCardTiltListeners();
			return;
		}

		if (advantagesCardTiltReady) {
			return;
		}

		advantagesCardTiltCards = [
			...document.querySelectorAll(".advantages__card"),
		].filter((card) => card instanceof HTMLElement);

		advantagesCardTiltCards.forEach((card) => {
			card.addEventListener("pointermove", handleAdvantagesCardTiltMove, {
				passive: true,
			});
			card.addEventListener("pointerleave", handleAdvantagesCardTiltLeave, {
				passive: true,
			});
			card.addEventListener("pointercancel", handleAdvantagesCardTiltLeave, {
				passive: true,
			});
		});

		advantagesCardTiltReady = advantagesCardTiltCards.length > 0;
	};

	const destroyLenisScroll = (status = "disabled") => {
		if (lenisFrame !== 0) {
			window.cancelAnimationFrame(lenisFrame);
			lenisFrame = 0;
		}

		if (lenisInstance) {
			lenisInstance.destroy();
			lenisInstance = null;
		}

		document.documentElement.style.removeProperty("scroll-behavior");
		document.documentElement.classList.remove("page--lenis-ready");
		document.documentElement.dataset.smoothScroll = status;
		document.documentElement.dataset.lenisStatus = status;
	};

	const driveLenisFrame = (time) => {
		if (!lenisInstance) {
			lenisFrame = 0;
			return;
		}

		lenisInstance.raf(time);
		lenisFrame = window.requestAnimationFrame(driveLenisFrame);
	};

	const startLenisFrame = () => {
		if (lenisFrame !== 0) {
			return;
		}

		lenisFrame = window.requestAnimationFrame(driveLenisFrame);
	};

	const initLenisScroll = () => {
		if (shouldDisableSmoothScroll()) {
			destroyLenisScroll("reduced-motion");
			return;
		}

		if (lenisInstance) {
			return;
		}

		if (typeof window.Lenis !== "function") {
			document.documentElement.dataset.smoothScroll = "native";
			document.documentElement.dataset.lenisStatus = "missing";
			return;
		}

		lenisInstance = new window.Lenis({
			autoRaf: false,
			duration: 1.45,
			easing: (time) => Math.min(1, 1.001 - 2 ** (-10 * time)),
			smoothWheel: true,
			gestureOrientation: "vertical",
			wheelMultiplier: 0.78,
			touchMultiplier: 1,
			prevent: (node) =>
				node instanceof Element && node.closest(".header__nav") !== null,
			anchors: false,
		});
		lenisInstance.on("scroll", () => {
			scheduleScrollTriggerUpdate();
			scheduleDirectionsScrollProgress();
			scheduleActiveNavUpdate();
			scheduleHeaderHeroStateUpdate();
		});
		startLenisFrame();

		document.documentElement.style.scrollBehavior = "auto";
		document.documentElement.dataset.smoothScroll = "lenis";
		document.documentElement.dataset.lenisStatus = "ready";
		document.documentElement.classList.add("page--lenis-ready");
	};

	const getAnchorTarget = (link) => {
		const href = link.getAttribute("href");

		if (!href || !href.startsWith("#") || href === "#") {
			return null;
		}

		return document.getElementById(decodeURIComponent(href.slice(1)));
	};

	const setContactFormStatus = (statusElement, message, type = "") => {
		if (!statusElement) {
			return;
		}

		statusElement.hidden = false;
		statusElement.textContent = message;
		statusElement.classList.remove(
			"contacts__form-status--success",
			"contacts__form-status--error",
		);

		if (type) {
			statusElement.classList.add(`contacts__form-status--${type}`);
		}
	};

	const getFormValue = (formData, fieldName) => {
		const value = formData.get(fieldName);

		return typeof value === "string" ? value.trim() : "";
	};

	const getContactFormEndpoint = (form) => {
		const action = form.getAttribute("action") || "/api/telegram";

		return new URL(action, window.location.href).toString();
	};

	const initContactFormSubmission = () => {
		const form = document.querySelector("[data-telegram-form]");

		if (!(form instanceof HTMLFormElement)) {
			return;
		}

		const statusId = form.getAttribute("aria-describedby") || "";
		const statusElement = statusId ? document.getElementById(statusId) : null;
		const submitButton = form.querySelector(".contacts__submit");
		const defaultButtonText =
			submitButton?.textContent || "Получить консультацию";

		form.addEventListener("submit", async (event) => {
			event.preventDefault();

			if (!form.reportValidity()) {
				setContactFormStatus(
					statusElement,
					"Пожалуйста, заполните все поля заявки.",
					"error",
				);
				return;
			}

			const formData = new FormData(form);
			const payload = {
				name: getFormValue(formData, "name"),
				contact: getFormValue(formData, "contact"),
				project: getFormValue(formData, "project"),
				website: getFormValue(formData, "website"),
				page: window.location.href,
			};

			if (!payload.name || !payload.contact || !payload.project) {
				setContactFormStatus(
					statusElement,
					"Пожалуйста, заполните все поля заявки.",
					"error",
				);
				return;
			}

			if (submitButton instanceof HTMLButtonElement) {
				submitButton.disabled = true;
				submitButton.textContent = "Отправляем...";
			}
			form.setAttribute("aria-busy", "true");
			setContactFormStatus(statusElement, "Отправляем заявку в Telegram...");

			try {
				const response = await fetch(getContactFormEndpoint(form), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
				});
				const contentType = response.headers.get("content-type") || "";
				const result = contentType.includes("application/json")
					? await response.json().catch(() => null)
					: null;

				if (!response.ok) {
					throw new Error(result?.message || "Не удалось отправить заявку.");
				}

				form.reset();
				setContactFormStatus(
					statusElement,
					"Спасибо! Заявка отправлена, мы скоро свяжемся с вами.",
					"success",
				);
			} catch (error) {
				console.error("Fiola contact form submission failed", error);
				setContactFormStatus(
					statusElement,
					"Не получилось отправить заявку. Напишите нам в Telegram: Fiola_Create.",
					"error",
				);
			} finally {
				form.removeAttribute("aria-busy");
				if (submitButton instanceof HTMLButtonElement) {
					submitButton.disabled = false;
					submitButton.textContent = defaultButtonText;
				}
			}
		});
	};

	const scrollToTarget = (target) => {
		if (shouldDisableSmoothScroll()) {
			target.scrollIntoView({ behavior: "auto", block: "start" });
			return;
		}

		if (lenisInstance) {
			lenisInstance.scrollTo(target, {
				duration: 1.35,
				offset: 0,
			});
			return;
		}

		target.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	const initMobileNavigation = () => {
		const header = document.querySelector(".header");
		const toggle = document.querySelector(".header__burger");
		const nav = document.querySelector(".header__nav");
		const mobileQuery = window.matchMedia("(max-width: 520px)");

		if (
			!(header instanceof HTMLElement) ||
			!(toggle instanceof HTMLButtonElement) ||
			!(nav instanceof HTMLElement)
		) {
			return;
		}

		const setMenuState = (isOpen) => {
			header.classList.toggle("header--menu-open", isOpen);
			toggle.setAttribute("aria-expanded", String(isOpen));
			toggle.setAttribute(
				"aria-label",
				isOpen ? "Закрыть меню" : "Открыть меню",
			);
		};

		toggle.addEventListener("click", () => {
			setMenuState(!header.classList.contains("header--menu-open"));
		});

		nav.addEventListener("click", (event) => {
			const target = event.target;

			if (target instanceof Element && target.closest("a[href]")) {
				setMenuState(false);
			}
		});

		document.addEventListener("keydown", (event) => {
			if (
				event.key === "Escape" &&
				header.classList.contains("header--menu-open")
			) {
				setMenuState(false);
				toggle.focus();
			}
		});

		const handleMobileQueryChange = () => {
			if (!mobileQuery.matches) {
				setMenuState(false);
			}
		};

		if (typeof mobileQuery.addEventListener === "function") {
			mobileQuery.addEventListener("change", handleMobileQueryChange);
		} else if (typeof mobileQuery.addListener === "function") {
			mobileQuery.addListener(handleMobileQueryChange);
		}

		setMenuState(false);
	};

	const initSmoothAnchors = () => {
		const anchorLinks = [...document.querySelectorAll('a[href^="#"]')];

		for (const link of anchorLinks) {
			link.addEventListener("click", (event) => {
				const target = getAnchorTarget(link);

				if (!target) {
					return;
				}

				if (navTargets.some(({ id }) => id === target.id)) {
					preferredNavId = target.id;
					setActiveNavLink(target.id);
					schedulePreferredNavReset();
				}

				event.preventDefault();
				scrollToTarget(target);
				window.history.pushState(null, "", link.hash);
				scheduleActiveNavUpdate();
			});
		}
	};

	const initStickyNavigation = () => {
		if (navTargets.length === 0) {
			return;
		}

		for (const { id, link } of navTargets) {
			link.addEventListener("click", () => setActiveNavLink(id));
		}

		window.addEventListener("scroll", scheduleActiveNavUpdate, {
			passive: true,
		});
		window.addEventListener("scroll", scheduleHeaderHeroStateUpdate, {
			passive: true,
		});
		window.addEventListener("scroll", scheduleScrollTriggerUpdate, {
			passive: true,
		});
		window.addEventListener("scroll", scheduleDirectionsScrollProgress, {
			passive: true,
		});
		window.addEventListener("resize", () => {
			scheduleAboutPinnedScrollMeasure();
			measureDirectionsPinnedScroll();
			scheduleFilmGrainResize();
			scheduleActiveNavUpdate();
			scheduleHeaderHeroStateUpdate();
		});
		window.addEventListener("hashchange", () => {
			const hashId = window.location.hash.slice(1);

			if (navTargets.some(({ id }) => id === hashId)) {
				setActiveNavLink(hashId);
			}

			scheduleActiveNavUpdate();
		});

		updateActiveNavFromScroll();
		updateHeaderHeroState();
	};

	const initGsapAnimations = () => {
		registerScrollTrigger();
		initTechStackAnimations();
	};

	const getCustomCursorInteractiveTarget = (target) => {
		if (!(target instanceof Element)) {
			return null;
		}

		const interactiveTarget = target.closest(customCursorInteractiveSelector);

		if (!(interactiveTarget instanceof Element)) {
			return null;
		}

		if (
			interactiveTarget instanceof HTMLButtonElement ||
			interactiveTarget instanceof HTMLInputElement ||
			interactiveTarget instanceof HTMLSelectElement ||
			interactiveTarget instanceof HTMLTextAreaElement
		) {
			return interactiveTarget.disabled ? null : interactiveTarget;
		}

		return interactiveTarget;
	};

	const setCustomCursorHoverTarget = (target) => {
		customCursorInteractiveTarget = getCustomCursorInteractiveTarget(target);
		document.documentElement.classList.toggle(
			"page--custom-cursor-hover",
			Boolean(customCursorInteractiveTarget),
		);
	};

	const updateCustomCursorPosition = () => {
		customCursorFrame = 0;

		if (!customCursorElement) {
			return;
		}

		customCursorCurrentX += (customCursorTargetX - customCursorCurrentX) * 0.18;
		customCursorCurrentY += (customCursorTargetY - customCursorCurrentY) * 0.18;
		customCursorElement.style.transform = `translate3d(${customCursorCurrentX.toFixed(2)}px, ${customCursorCurrentY.toFixed(2)}px, 0)`;

		if (
			Math.abs(customCursorTargetX - customCursorCurrentX) > 0.08 ||
			Math.abs(customCursorTargetY - customCursorCurrentY) > 0.08
		) {
			customCursorFrame = window.requestAnimationFrame(
				updateCustomCursorPosition,
			);
		}
	};

	const scheduleCustomCursorPosition = () => {
		if (customCursorFrame !== 0) {
			return;
		}

		customCursorFrame = window.requestAnimationFrame(
			updateCustomCursorPosition,
		);
	};

	const handleCustomCursorPointerMove = (event) => {
		if (event.pointerType === "touch" || !customCursorElement) {
			return;
		}

		customCursorTargetX = event.clientX;
		customCursorTargetY = event.clientY;

		if (!customCursorIsVisible) {
			customCursorIsVisible = true;
			customCursorCurrentX = customCursorTargetX;
			customCursorCurrentY = customCursorTargetY;
			document.documentElement.classList.add("page--custom-cursor-active");
		}

		setCustomCursorHoverTarget(event.target);
		scheduleCustomCursorPosition();
	};

	const handleCustomCursorPointerOver = (event) => {
		if (event.pointerType === "touch") {
			return;
		}

		setCustomCursorHoverTarget(event.target);
	};

	const handleCustomCursorPointerOut = (event) => {
		if (!customCursorInteractiveTarget) {
			return;
		}

		const relatedTarget = event.relatedTarget;

		if (
			relatedTarget instanceof Node &&
			customCursorInteractiveTarget.contains(relatedTarget)
		) {
			return;
		}

		setCustomCursorHoverTarget(relatedTarget);
	};

	const handleCustomCursorPointerDown = (event) => {
		if (event.pointerType === "touch" || !customCursorElement) {
			return;
		}

		document.documentElement.classList.add("page--custom-cursor-pressed");
	};

	const handleCustomCursorPointerUp = () => {
		document.documentElement.classList.remove("page--custom-cursor-pressed");
	};

	const handleCustomCursorLeave = () => {
		customCursorIsVisible = false;
		customCursorInteractiveTarget = null;
		document.documentElement.classList.remove(
			"page--custom-cursor-active",
			"page--custom-cursor-hover",
			"page--custom-cursor-pressed",
		);
	};

	const addCustomCursorListeners = () => {
		if (customCursorListenersReady) {
			return;
		}

		window.addEventListener("pointermove", handleCustomCursorPointerMove, {
			passive: true,
		});
		window.addEventListener("pointerdown", handleCustomCursorPointerDown, {
			passive: true,
		});
		window.addEventListener("pointerup", handleCustomCursorPointerUp, {
			passive: true,
		});
		window.addEventListener("pointercancel", handleCustomCursorPointerUp, {
			passive: true,
		});
		window.addEventListener("blur", handleCustomCursorLeave);
		document.addEventListener("pointerleave", handleCustomCursorLeave, {
			passive: true,
		});
		document.addEventListener("pointerover", handleCustomCursorPointerOver, {
			passive: true,
		});
		document.addEventListener("pointerout", handleCustomCursorPointerOut, {
			passive: true,
		});
		customCursorListenersReady = true;
	};

	const removeCustomCursorListeners = () => {
		if (!customCursorListenersReady) {
			return;
		}

		window.removeEventListener("pointermove", handleCustomCursorPointerMove);
		window.removeEventListener("pointerdown", handleCustomCursorPointerDown);
		window.removeEventListener("pointerup", handleCustomCursorPointerUp);
		window.removeEventListener("pointercancel", handleCustomCursorPointerUp);
		window.removeEventListener("blur", handleCustomCursorLeave);
		document.removeEventListener("pointerleave", handleCustomCursorLeave);
		document.removeEventListener("pointerover", handleCustomCursorPointerOver);
		document.removeEventListener("pointerout", handleCustomCursorPointerOut);
		customCursorListenersReady = false;
	};

	const destroyCustomCursor = (status = "disabled") => {
		if (customCursorFrame !== 0) {
			window.cancelAnimationFrame(customCursorFrame);
			customCursorFrame = 0;
		}

		removeCustomCursorListeners();
		customCursorElement?.remove();
		customCursorElement = null;
		customCursorIsVisible = false;
		customCursorInteractiveTarget = null;
		document.documentElement.classList.remove(
			"page--custom-cursor",
			"page--custom-cursor-active",
			"page--custom-cursor-hover",
			"page--custom-cursor-pressed",
		);
		document.documentElement.dataset.customCursor = status;
	};

	const initCustomCursor = () => {
		if (!canUseCustomCursor()) {
			destroyCustomCursor(
				customCursorPointerQuery.matches
					? "reduced-motion"
					: "unsupported-pointer",
			);
			return;
		}

		if (!customCursorElement) {
			customCursorElement = document.createElement("div");
			customCursorElement.className = "custom-cursor";
			customCursorElement.setAttribute("aria-hidden", "true");
			customCursorElement.innerHTML =
				'<span class="custom-cursor__ring"></span><span class="custom-cursor__dot"></span>';
			document.body.append(customCursorElement);
		}

		addCustomCursorListeners();
		document.documentElement.classList.add("page--custom-cursor");
		document.documentElement.dataset.customCursor = "ready";
	};

	const init = () => {
		document.documentElement.dataset.fiolaScript = "initializing";
		document.documentElement.dataset.jsReady = "true";
		initLenisScroll();
		initAboutPinnedScroll();
		initDirectionsPinnedScroll();
		initAdvantagesCardTilt();
		initMobileNavigation();
		initSmoothAnchors();
		initStickyNavigation();
		initContactFormSubmission();
		destroyCustomCursor("disabled");
		stopFilmGrain("disabled");
		initGsapAnimations();
		scheduleAboutScrollRefresh();
		document.documentElement.dataset.fiolaScript = "ready";
	};

	window.Fiola = {
		initGsapAnimations,
		getLenisInstance: () => lenisInstance,
		getSmoothScrollState: () => ({
			headerState: document.documentElement.dataset.headerState || "unknown",
			aboutScrollPinned:
				document.documentElement.dataset.aboutScrollPinned || "unknown",
			aboutTrackDistance,
			directionsScrollPinned:
				document.documentElement.dataset.directionsScrollPinned || "unknown",
			directionsScrollDistance,
			directionsStepDistance,
			motionMode: motionMode || "default",
			prefersReducedMotion: motionQuery.matches,
			ready: Boolean(lenisInstance),
			status: document.documentElement.dataset.lenisStatus || "unknown",
			type: document.documentElement.dataset.smoothScroll || "unknown",
		}),
	};

	const handleMotionPreferenceChange = () => {
		document.documentElement.dataset.motionPreference = motionQuery.matches
			? "reduce"
			: "no-preference";
		scheduleAboutPinnedScrollMeasure();
		measureDirectionsPinnedScroll();
		initAdvantagesCardTilt();
		destroyCustomCursor("disabled");
		stopFilmGrain("disabled");
		initGsapAnimations();
	};

	const handleCustomCursorCapabilityChange = () => {
		initAdvantagesCardTilt();
		destroyCustomCursor("disabled");
	};

	if (typeof motionQuery.addEventListener === "function") {
		motionQuery.addEventListener("change", handleMotionPreferenceChange);
	} else if (typeof motionQuery.addListener === "function") {
		motionQuery.addListener(handleMotionPreferenceChange);
	}
	if (typeof customCursorPointerQuery.addEventListener === "function") {
		customCursorPointerQuery.addEventListener(
			"change",
			handleCustomCursorCapabilityChange,
		);
	} else if (typeof customCursorPointerQuery.addListener === "function") {
		customCursorPointerQuery.addListener(handleCustomCursorCapabilityChange);
	}
	document.addEventListener("fiola:gsap-ready", initGsapAnimations);

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init, { once: true });
	} else {
		init();
	}
})();
