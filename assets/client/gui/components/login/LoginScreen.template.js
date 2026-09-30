(() => {
  const TEMPLATE = `

        <style>
          
          /* Define CSS variables for theming */
          :host {
            --theme-primary: #e83d52; /* Default: Strawberry Red */
            --theme-secondary: rgba(232, 61, 82, 0.3);
            --theme-highlight: rgba(255, 220, 220, 0.3);
            --theme-shadow: rgba(252, 93, 93, 0.1);
            --theme-gradient-start: rgba(255, 220, 220, 0.3);
            --theme-gradient-end: rgba(255, 245, 230, 0.6);
            --theme-hover-border: rgba(232, 61, 82, 0.5);
            --theme-radial-1: rgba(255, 180, 180, 0.05);
            --theme-radial-2: rgba(255, 200, 200, 0.07);
            --theme-settings-hover: rgba(232, 61, 82, 0.05);
            --theme-settings-border: rgba(232, 61, 82, 0.2);
            /* CRITICAL: Default to dark mode to prevent light mode flash */
            /* Will be switched to light if user preference is light mode */
            --theme-box-background: rgba(45, 45, 45, 0.95); /* Default to dark */
            --theme-box-background-dark: rgba(45, 45, 45, 0.95); /* Dark mode box background */
            --theme-box-background-light: rgba(255, 245, 230, 0.95); /* Light mode box background */
            --theme-button-bg: var(--theme-primary); /* Default button background */
            --theme-button-border: var(--theme-secondary); /* Default button border */
            --theme-button-text: #FFFFFF; /* Default button text */
            --dark-mode: 0; /* Dark mode flag: 0 = light, 1 = dark */

            width: 100%;
            height: 100%;
            display: grid;
            grid-template: 1fr min(590px, 80%) 1fr / 1fr min(70px, 8%) min(936px, 75%) 1fr;
            grid-template-areas: ". . . button-tray"
                                 ". panel box ."
                                 ". . . .";
            background-color: rgba(239, 234, 221, 0);
            transition: background-color 0.2s;

            /* Hide login screen until theme is loaded to prevent FOUC */
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.15s ease-out;
          }

          :host(.theme-ready) {
            /* Show login screen once theme is loaded */
            opacity: 1;
            visibility: visible;
          }
          
          /* Settings button and panel styles */
          .button-container-bottom-left {
            position: absolute;
            bottom: 10px; /* Reduced bottom padding */
            left: 10px;
            display: flex;
            flex-direction: column;
            gap: 10px; /* Space between buttons */
            z-index: 1000;
            pointer-events: none; /* Allow clicks to pass through container */
          }

          .icon-button { /* Common style for icon buttons */
            width: 32px;
            height: 32px;
            font-size: 18px;
            border: 2px solid var(--theme-primary, #e83d52);
            border-radius: 8px;
            background-color: var(--theme-box-background);
            cursor: pointer;
            opacity: 0.8;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: auto; /* Re-enable pointer events only for the button itself */
            /* Ensure the button doesn't extend beyond its visual bounds */
            box-sizing: border-box;
            overflow: hidden;
            /* Remove any potential margin/padding that could extend hover area */
            margin: 0;
            padding: 0;
            /* Ensure proper cursor behavior - only show pointer when directly over button */
            cursor: pointer !important;
            /* Limit interaction area to exact button size */
            position: relative;
            flex-shrink: 0;
          }

          .icon-button:hover {
            opacity: 1;
            border-color: var(--theme-hover-border);
            transform: scale(1.05);
            /* Ensure hover effects don't extend beyond button boundaries */
            transform-origin: center;
          }

          #devtools-btn svg {
            display: block;
            color: #888;
          }
          
          #devtools-btn-wrapper {
            position: relative;
            display: inline-block;
            contain: layout style;
            overflow: visible;
          }

          #devtools-error-badge {
            position: absolute;
            top: -6px;
            right: -6px;
            background-color: #e74c3c;
            color: white;
            border-radius: 50%;
            min-width: 20px;
            height: 20px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            line-height: 1;
            padding: 0;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
            pointer-events: none;
            z-index: 1000;
            will-change: transform;
            animation: badge-pulse 2s ease-in-out infinite;
          }

          #devtools-error-badge.show {
            display: flex;
          }

          @keyframes badge-pulse {
            0%, 100% {
              transform: scale(1);
            }
            50% {
              transform: scale(1.1);
            }
          }

          #settings-btn, #devtools-btn {
            contain: layout style;
            outline: none;
            min-width: 32px;
            max-width: 32px;
            min-height: 32px;
            max-height: 32px;
            line-height: 1;
            vertical-align: baseline;
            cursor: pointer;
          }

          /* Ensure no cursor interference outside button bounds */
          .button-container-bottom-left::before {
            content: '';
            position: absolute;
            top: -10px;
            left: -10px;
            right: -10px;
            bottom: -10px;
            pointer-events: none;
            cursor: default;
            z-index: -1;
          }

          /* Additional safeguards to prevent cursor interference */
          .icon-button:not(:hover) {
            cursor: default;
          }
          
          .icon-button:hover {
            cursor: pointer;
          }

          /* Ensure the game area maintains proper cursor behavior */
          body:not(.login-screen) .button-container-bottom-left {
            pointer-events: none !important;
          }
          
          body:not(.login-screen) .icon-button {
            pointer-events: none !important;
          }
          
          #settings-panel {
            position: absolute;
            bottom: 52px; /* Adjusted for new button position (10px + 32px button + 10px gap) */
            left: 10px;
            width: 250px;
            background-color: var(--theme-box-background);
            border: 2px solid var(--theme-secondary);
            border-radius: 12px;
            padding: 15px;
            /* display: none; */ /* Handled by animation */
            z-index: 999; /* Below buttons */
            box-shadow: 0 8px 32px var(--theme-shadow);
            transition: border-color 0.3s ease, box-shadow 0.3s ease;
            /* Prevent content from extending beyond panel boundaries */
            box-sizing: border-box;
            contain: layout style;
          }

          /* Auto Wheel and Import components positioning */
          #auto-wheel-section {
            position: absolute;
            bottom: 10px;
            right: 10px;
            width: 300px;
            z-index: 1000;
            display: none; /* Hidden by default */
          }

          #import-section {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 1000;
            display: none; /* Hidden by default */
          }

          #auto-wheel-section.visible {
            display: block;
          }

          #import-section.visible {
            display: block;
          }
          
          #settings-panel h3 {
            margin-top: 0;
            color: var(--theme-primary);
            font-family: Tiki-Island;
            font-size: 18px;
            text-align: center;
            margin-bottom: 10px;
            text-shadow: 1px 1px 0px var(--theme-shadow);
            transition: color 0.3s ease, text-shadow 0.3s ease;
            /* Prevent text overflow beyond panel */
            box-sizing: border-box;
            overflow: hidden;
            word-wrap: break-word;
            max-width: 100%;
          }
          
          .settings-group {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--theme-settings-border);
            transition: border-bottom-color 0.3s ease;
          }
          
          .settings-group:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          
          .settings-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 12px;
            color: #6E4B37;
            font-family: CCDigitalDelivery;
            padding: 6px 4px;
            transition: background-color 0.2s;
            border-radius: 6px;
            box-sizing: border-box;
            max-width: 100%;
            flex-wrap: wrap;
          }

          .settings-item:hover {
            background-color: var(--theme-settings-hover);
          }

          .settings-toggle {
            width: 38px;
            height: 20px;
            background: #4b5563;
            border-radius: 10px;
            position: relative;
            cursor: pointer;
            transition: background-color 0.2s ease;
            flex-shrink: 0;
          }
          .settings-toggle::after {
            content: '';
            position: absolute;
            width: 16px;
            height: 16px;
            background: white;
            border-radius: 50%;
            top: 2px;
            left: 2px;
            transition: transform 0.2s ease;
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          }
          .settings-peer:checked ~ .settings-toggle {
            background-color: var(--theme-primary, #e83d52);
          }
          .settings-peer:checked ~ .settings-toggle::after {
            transform: translateX(18px);
          }
          .sr-only {
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0,0,0,0);
            border: 0;
          }

          /* Ensure all settings panel content is properly contained */
          #settings-panel * {
            box-sizing: border-box;
            max-width: 100%;
          }

          #settings-panel h4, #settings-panel h5 {
            overflow: hidden;
            word-wrap: break-word;
            max-width: 100%;
          }

          #settings-panel label, #settings-panel select {
            overflow: hidden;
            word-wrap: break-word;
            max-width: 100%;
          }

          .hidden {
            display: none !important;
          }

          #box-background {
            /* Original grid area */
            grid-area: box;
            background-color: var(--theme-box-background); /* Use theme variable */
            border-radius: 20px;
            box-shadow: 0 8px 32px var(--theme-shadow);
            border: 1px solid var(--theme-secondary);
            opacity: 1;
            transition: opacity 0.2s, box-shadow 0.3s ease, border-color 0.3s ease, background-color 0.3s ease; /* Added background-color transition */
            /* Ensure dark mode background is applied immediately when class is present */
            will-change: background-color;
          }

          :host(.dark-mode) #box-background {
            background-color: var(--theme-box-background-dark);
          }

          :host(.dark-mode) #settings-panel {
            background-color: var(--theme-box-background-dark);
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          }

          :host(.dark-mode) .icon-button {
            background-color: var(--theme-box-background-dark);
            border-color: rgba(255, 255, 255, 0.3);
          }

          :host(.dark-mode) .icon-button:hover {
            border-color: rgba(255, 255, 255, 0.5);
          }

          :host(.dark-mode) .settings-item {
            color: #E0E0E0;
          }


          :host(.dark-mode) #settings-panel h4 {
            color: #E0E0E0;
          }

          :host(.dark-mode) .settings-item div {
            color: #B0B0B0 !important;
          }

          @media (max-width: 950px), (max-height: 590px) {
            #box-background {
              display: none;
            }

            #panel {
              display: none;
            }

            :host {
              display: flex;
              justify-content: center;
              align-items: center;
              overflow: auto;
              background-color: rgba(30, 27, 28, 0.14);
            }

            #box {
              padding: 30px 40px;
              max-width: 500px;
              width: 100%;
              box-sizing: border-box;
              background-color: var(--theme-box-background);
              border-radius: 20px;
              border: 1px solid var(--theme-secondary);
              box-shadow: 0 8px 32px var(--theme-shadow);
            }

            :host(.dark-mode) #box {
              background-color: var(--theme-box-background-dark);
            }
          }

          #box {
            grid-area: box;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 50px 70px 50px;
            /* position: relative; */ /* REMOVED */
            /* z-index: 1; */         /* REMOVED */
            
            /* Themed radial accents */
            background-image: 
              radial-gradient(circle at 10% 20%, var(--theme-radial-1) 0%, transparent 50%),
              radial-gradient(circle at 90% 80%, var(--theme-radial-2) 0%, transparent 50%);
            transition: background-image 0.3s ease;
            border-radius: 20px;
          }

          #login-container {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          #login-container > * {
            margin-bottom: 9px;
          }

          #login-image {
            user-select: none;
            pointer-events: none;
            grid-area: left;
          }

          #need-account {
            user-select: none;
            pointer-events: none;
            font-size: 12px;
            line-height: 18px;
            letter-spacing: -0.25px;
            color: #6E4B37;
            font-family: CCDigitalDelivery;
            font-weight: bold;
          }

          #player-login-text {
            color: var(--theme-primary);
            font-family: Tiki-Island;
            font-size: 36px;
            text-shadow: 1px 2px 0px var(--theme-shadow);
            margin-bottom: 10px;
            letter-spacing: 0.5px;
            transition: color 0.3s ease, text-shadow 0.3s ease;
          }

          #login-btn-container {
            display: grid;
            grid-template-columns: 1fr;
            justify-items: center;
            position: relative;
          }

          #log-in-btn {
            padding: 6px 24px;
            /* Apply theme variables to bubble buttons */
            --ajd-bubble-button-background-color: var(--theme-button-bg);
            --ajd-bubble-button-border-color: var(--theme-button-border);
            --ajd-bubble-button-text-color: var(--theme-button-text);
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
          }

          @keyframes fade {
            0%,100% { opacity: 0 }
            50% { opacity: 1 }
          }

           @keyframes spin {
             from {
               transform: rotate(0deg);
             }
             to {
               transform: rotate(-360deg);
             }
           }

           /* --- Fruit Rotation Animation (Simple Pop) --- */
           @keyframes fruit-pop {
             0%   { transform: scale(1); } /* Start normal */
             50%  { transform: scale(1.25); } /* Pop bigger */
             100% { transform: scale(1); } /* Settle to normal size */
           }

           .fruit-animate {
             /* Apply the animation */
             animation: fruit-pop 0.3s ease-out; /* Quick pop */
             /* Ensure the image flips back correctly if starting flipped */
             transform-style: preserve-3d;
           }
           /* --- End Fruit Rotation Animation --- */

          #spinner {
            position: absolute;
            left: calc(50% + 60px);
            top: 50%;
            transform: translateY(-50%);
            height: 24px;
            opacity: 0;
            transition: opacity .5s;
            animation: spin 1500ms linear infinite;
          }

          /* --- Fruit Rotation Animation (Simple Pop) --- */
          @keyframes fruit-pop {
            0%   { transform: scale(1); } /* Start normal */
            50%  { transform: scale(1.25); } /* Pop bigger */
            100% { transform: scale(1); } /* Settle to normal size */
          }

          .fruit-animate {
            /* Apply the animation */
            animation: fruit-pop 0.3s ease-out; /* Quick pop */
            /* Ensure the image flips back correctly if starting flipped */
            transform-style: preserve-3d; 
          }
          /* --- End Fruit Rotation Animation --- */

          #spinner.show {
            opacity: 1;
          }

          ajd-text-input {
            width: 100%;
            border-radius: 25px;
            border: var(--theme-secondary) 2px solid;
            transition: border-color 0.3s ease;
            margin-bottom: 12px;
          }

          ajd-text-input:hover {
            border-color: var(--theme-hover-border);
          }

          #remember-me-cb {
            font-size: 15px;
            letter-spacing: -1px;
            font-weight: bold;
          }

          #forgot-password-link {
            font-size: 12px;
            line-height: 14px;
            letter-spacing: .25px;
            color: #CC6C2B;
            text-decoration: none;
            user-select: none;
            cursor: pointer;
            font-family: CCDigitalDelivery;
          }

          .vertical-spacer {
            height: 2px;
            width: 75%;
            border-bottom: var(--theme-secondary) 2px solid;
            margin: 10px 0;
            transition: border-bottom-color 0.3s ease;
          }

          #forgot-password-link {
            letter-spacing: -0.5px;
          }

          #forgot-password-link:hover {
            text-decoration: underline;
          }

          #create-account-btn {
            font-size: 24px;
            padding: 4px 12px;
            /* Apply theme variables to bubble buttons */
            --ajd-bubble-button-background-color: var(--theme-button-bg);
            --ajd-bubble-button-border-color: var(--theme-button-border);
            --ajd-bubble-button-text-color: var(--theme-button-text);
            transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease;
          }

          #version {
            position: absolute;
            left: 52px; /* Moved to the right to avoid button overlap */
            bottom: 10px;
            display: grid;
            grid-template-columns: 1fr 24px;
          }

          #version:hover {
            text-decoration: underline;
          }

          #version-link {
            font-size: 16px;
            line-height: 24px;
            letter-spacing: -0.5px;
            color: #fff5eb;
            background: rgba(0, 0, 0, 0.45);
            padding: 0 10px;
            border-radius: 12px;
            text-decoration: none;
            user-select: none;
            cursor: pointer;
            font-family: CCDigitalDelivery;
          }

          #version-status-icon {
            background: url(images/core/core_form_input_status_icn_sprite.svg);
            background-repeat: no-repeat;
            background-size: 80px;
            width: 20px;
            height: 20px;
            opacity: 0.0;
          }

          #version-status-icon.check {
            background-position: -20px 0px;
            animation: spin 1500ms linear infinite;
            opacity: 1.0;
            transition-property: opacity;
            transition-duration: 0.5s;
          }

          #version-status-icon.download {
            opacity: 1.0;
          }

          #version-status-icon.restart {
            background-position: -40px 0px;
            opacity: 0.0;
            animation: fade 1.5s ease-out infinite;
          }

          #version-status-icon.error {
            background-position: -60px 0px;
            opacity: 0.0;
            animation: fade 1.5s ease-out infinite;
          }

          #button-tray {
            grid-area: button-tray;
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
          }
          #button-tray ajd-button {
            width: 54px;
            height: 54px;
            border: 2px solid var(--theme-primary, #e83d52);
            border-radius: 8px;
            transition: border-color 0.3s ease;
          }

          #button-tray ajd-button:hover {
            border-color: var(--theme-hover-border, #e83d52);
          }

          #glockoma-credit {
            position: absolute;
            bottom: 10px;
            left: 50%;
            transform: translateX(-50%);
            font-family: CCDigitalDelivery;
            font-size: 12px;
            color: #f3e6da;
            background: rgba(0, 0, 0, 0.45);
            padding: 3px 12px;
            border-radius: 12px;
            white-space: nowrap;
          }

          #glockoma-credit a {
            color: #f3e6da;
            text-decoration: none;
            font-weight: normal;
          }

          #glockoma-credit a:hover {
            text-decoration: underline;
          }

          /* Account Management Panel Styling MOVED to AccountManagementPanel.css */
          /* Context Menu Styling MOVED to AccountManagementPanel.css */

          /* Settings Panel Animation */
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          #settings-panel {
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            padding: 15px; /* Keep padding defined here, will be hidden by max-height: 0 */
            transition: max-height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), 
                        opacity 0.3s ease; /* Removed padding from transition */
            transform-origin: bottom left;
            /* width: 250px; is already defined above, ensure it's not overridden */
            overflow-y: auto; /* Enable vertical scrolling */
            padding-right: 5px; /* Add some space for the scrollbar */
            /* Prevent any cursor interference when panel is hidden */
            pointer-events: none;
          }

          /* Custom Scrollbar Styles */
          #settings-panel::-webkit-scrollbar {
            width: 8px;
          }

          #settings-panel::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1); /* A subtle track background */
            border-radius: 10px;
          }

          #settings-panel::-webkit-scrollbar-thumb {
            background-color: var(--theme-primary); /* Use the primary theme color */
            border-radius: 10px;
          }

          #settings-panel::-webkit-scrollbar-thumb:hover {
            background-color: var(--theme-hover-border); /* Use the theme's hover color */
          }
          
          #settings-panel.show {
            max-height: 500px; /* Adjust as needed to fit content */
            opacity: 1;
            animation: slideUp 0.3s ease forwards;
            /* Re-enable pointer events when panel is shown */
            pointer-events: auto;
          }
          
          /* Show/hide warning for UUID spoofing */
          #uuid-spoofing-warning {
            max-height: 0;
            overflow: hidden;
            opacity: 0;
            transition: max-height 0.2s ease, opacity 0.2s ease, margin 0.2s ease;
          }
          
          #uuid-spoofing-warning.show {
            max-height: 100px; /* Adjust as needed */
            opacity: 1;
            margin-top: 5px;
          }

          .settings-tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 15px;
            border-bottom: 2px solid var(--theme-settings-border);
          }

          .settings-tab {
            flex: 1;
            padding: 8px 12px;
            background-color: transparent;
            border: none;
            border-bottom: 2px solid transparent;
            color: #6E4B37;
            font-family: CCDigitalDelivery;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-bottom: -2px;
            outline: none !important;
            box-shadow: none !important;
            -webkit-tap-highlight-color: transparent;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
          }

          .settings-tab:focus,
          .settings-tab:focus-visible,
          .settings-tab:active,
          .settings-tab:focus-within {
            outline: none !important;
            box-shadow: none !important;
            -webkit-tap-highlight-color: transparent;
          }

          .settings-tab:hover {
            color: var(--theme-primary);
            background-color: var(--theme-settings-hover);
          }

          .settings-tab.active {
            color: var(--theme-primary);
            border-bottom-color: var(--theme-primary);
            font-weight: bold;
          }

          .settings-tab-content {
            display: none;
          }

          .settings-tab-content.active {
            display: block;
          }

          .settings-subsection {
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.06);
          }
          .settings-subsection:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }

          .settings-subsection h5 {
            font-family: CCDigitalDelivery;
            color: #9ca3af;
            font-size: 10px;
            margin-top: 0;
            margin-bottom: 6px;
            letter-spacing: 0.05em;
            font-weight: bold;
          }

          .shortcuts-note {
            font-size: 10px;
            padding: 8px;
            color: #8B6914;
            font-style: italic;
            margin-bottom: 12px;
            text-align: center;
            background-color: rgba(255, 217, 0, 0.1);
            border-radius: 4px;
          }

          :host(.dark-mode) .settings-tab {
            color: #E0E0E0;
          }

          :host(.dark-mode) .settings-tab:hover {
            color: var(--theme-primary);
          }

          :host(.dark-mode) .settings-tab.active {
            color: var(--theme-primary);
          }

          :host(.dark-mode) .settings-subsection h5 {
            color: #E0E0E0;
          }

          :host(.dark-mode) .shortcuts-note {
            color: #E0E0E0;
          }

          #login-help-prompt {
            display: none;
            position: fixed;
            bottom: 16px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: var(--theme-box-background, rgba(45, 45, 45, 0.95));
            border: 2px solid var(--theme-secondary, rgba(232, 61, 82, 0.3));
            border-radius: 16px;
            padding: 14px 20px;
            font-family: CCDigitalDelivery, sans-serif;
            color: #E0E0E0;
            font-size: 14px;
            z-index: 100;
            box-shadow: 0 8px 32px var(--theme-shadow, rgba(252, 93, 93, 0.1));
            opacity: 0;
            transition: opacity 0.3s ease, transform 0.3s ease;
            max-width: 420px;
            text-align: center;
            background-image:
              radial-gradient(circle at 10% 20%, var(--theme-radial-1, rgba(255, 180, 180, 0.05)) 0%, transparent 50%),
              radial-gradient(circle at 90% 80%, var(--theme-radial-2, rgba(255, 200, 200, 0.07)) 0%, transparent 50%);
          }

          :host(:not(.dark-mode)) #login-help-prompt {
            background: var(--theme-box-background-light, rgba(255, 245, 230, 0.95));
            color: #6E4B37;
          }

          :host(.dark-mode) #login-help-prompt {
            background: var(--theme-box-background-dark, rgba(45, 45, 45, 0.95));
          }

          #login-help-prompt.show {
            display: block;
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          #login-help-prompt p {
            margin: 0 0 12px 0;
            line-height: 1.4;
            font-family: Tiki-Island, sans-serif;
            font-size: 16px;
            color: var(--theme-primary, #e83d52);
            text-shadow: 1px 1px 0px var(--theme-shadow, rgba(252, 93, 93, 0.1));
          }

          .help-prompt-buttons {
            display: flex;
            gap: 8px;
            justify-content: center;
          }

          .help-prompt-btn {
            padding: 7px 18px;
            border-radius: 8px;
            border: 2px solid transparent;
            font-family: CCDigitalDelivery, sans-serif;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .help-prompt-btn:active {
            transform: scale(0.96);
          }

          .help-prompt-btn-primary {
            background: var(--theme-primary, #e83d52);
            border-color: var(--theme-secondary, rgba(232, 61, 82, 0.3));
            color: white;
          }

          .help-prompt-btn-primary:hover {
            opacity: 0.9;
            transform: scale(1.02);
          }

          .help-prompt-btn-dismiss {
            background: transparent;
            border-color: var(--theme-secondary, rgba(232, 61, 82, 0.3));
            color: #B0B0B0;
          }

          :host(:not(.dark-mode)) .help-prompt-btn-dismiss {
            color: #6E4B37;
          }

          .help-prompt-btn-dismiss:hover {
            border-color: var(--theme-hover-border, rgba(232, 61, 82, 0.5));
            color: var(--theme-primary, #e83d52);
          }


          /* groups inside a settings pop-up are little separate cards */
          .wz-subcard { border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.16)); border-radius: 10px; padding: 8px 10px 10px; margin-bottom: 10px; background: rgba(255, 255, 255, 0.28); }
          .wz-subcard:last-child { margin-bottom: 0; }
          .wz-fold-body > [id^="custom-theme-color-container"] { margin: 0 !important; padding: 0 !important; background: none !important; }
          .wz-fold-body > [id^="custom-theme-color-container"] > .wz-subcard { margin-bottom: 10px; }
          .wz-fold-body > [id^="custom-theme-color-container"] > .wz-subcard:last-child { margin-bottom: 0; }
          .wz-subcard > .wz-subtitle, .wz-subcard .wz-subtitle { font-size: 11px; font-weight: bold; letter-spacing: .5px; text-transform: uppercase; color: var(--wz-muted, #777); border-bottom: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.12)); padding-bottom: 3px; margin: 0 0 8px; }
          .wz-subcard > [id^="custom-theme-color-container"] { margin: 0 !important; padding: 0 !important; background: none !important; }

          /* ================= Banana Jam minimal layout ================= */
          :host {
            grid-template: 1fr auto auto auto auto 1fr / 1fr min(380px, calc(100% - 26px)) 1fr;
            grid-template-areas: ". . button-tray"
                                 ". bar ."
                                 ". box ."
                                 ". tools ."
                                 ". credit ."
                                 ". . .";
            row-gap: 0;
          }

          #box-background,
          :host(.dark-mode) #box-background {
            border: 1px solid rgba(0, 0, 0, 0.12) !important;
            border-radius: 18px !important;
            box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35) !important;
          }

          #box {
            padding: 34px 36px 28px !important;
            background-image: none !important;
          }

          #login-container { width: 100%; }
          #login-container > * { margin-bottom: 10px; }

          #account-panel-instance { width: 100%; margin-bottom: 14px !important; }
          #login-app-icon { width: 52px !important; margin-bottom: 2px !important; }

          #player-login-text {
            font-size: 30px !important;
            text-shadow: none !important;
            -webkit-text-stroke: 0 !important;
            margin-bottom: 14px !important;
          }

          ajd-text-input {
            border-radius: 12px !important;
            border-width: 1.5px !important;
            margin-bottom: 8px !important;
          }

          #log-in-btn {
            width: 100%;
            box-sizing: border-box;
            text-align: center;
            border-radius: 12px !important;
            padding: 6px 0 !important;
          }
          #login-btn-container { width: 100%; }

          .vertical-spacer, #need-account { display: none !important; }

          #wz-links {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-top: 2px;
            margin-bottom: 0 !important;
          }
          .wz-dot { color: #9a8f86; font-family: CCDigitalDelivery; }
          #forgot-password-link { color: var(--theme-primary) !important; opacity: .85; }
          #create-account-btn {
            font-family: CCDigitalDelivery;
            font-size: 12px;
            line-height: 14px;
            letter-spacing: .25px;
            color: var(--theme-primary);
            opacity: .85;
            cursor: pointer;
            user-select: none;
            text-decoration: none;
          }
          #create-account-btn:hover { text-decoration: underline; }
          #create-account-btn:focus, #forgot-password-link:focus { outline: none; }
          #create-account-btn { box-shadow: none !important; border: none !important; background: none !important; padding: 0 !important; font-size: 12px !important; }

          /* Settings + logs + version sit under the card on the login screen */
          :host(:not(.in-game)) .button-container-bottom-left {
            position: static;
            grid-area: bar;
            justify-self: end;
            align-self: end;
            flex-direction: row;
            gap: 8px;
            margin: 0 0 13px;
            z-index: 1000;
            align-items: center;
            gap: 10px;
          }
          :host(:not(.in-game)) .button-container-bottom-left > .icon-button,
          :host(:not(.in-game)) .button-container-bottom-left #devtools-btn-wrapper .icon-button {
            width: 32px !important; height: 32px !important;
            min-width: 32px !important; max-width: 32px !important; min-height: 32px !important; max-height: 32px !important;
            margin: 0 !important; padding: 0 !important; box-sizing: border-box;
            display: inline-flex !important; align-items: center; justify-content: center;
          }
          :host(:not(.in-game)) .button-container-bottom-left #devtools-btn-wrapper { display: flex; margin: 0; width: 32px; height: 32px; }
          :host(:not(.in-game)) #version {
            position: static;
            grid-area: tools;
            justify-self: center;
            align-self: center;
            margin-top: 14px;
          }
          .icon-button,
          :host(.dark-mode) .icon-button {
            border: 1px solid rgba(0, 0, 0, 0.12) !important;
            border-radius: 10px !important;
            opacity: 0.9;
          }

          #version-link {
            background: none !important;
            padding: 0 !important;
            font-size: 13px !important;
            color: rgba(255, 255, 255, 0.85) !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
          }

          #glockoma-credit {
            position: static !important;
            transform: none !important;
            grid-area: credit;
            justify-self: center;
            margin-top: 10px;
            background: none !important;
            padding: 0 !important;
            color: rgba(255, 255, 255, 0.95) !important;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55), 0 0 1px rgba(0, 0, 0, 0.6);
            font-size: 11px !important;
          }
          #glockoma-credit b { color: #ffffff; }
          #glockoma-credit a { color: rgba(255, 255, 255, 0.95) !important; font-weight: normal !important; }
          /* on a very light background (and no picture) the text goes dark so it can be read */
          :host(.wz-bg-light:not(.wz-has-login-image)) #glockoma-credit,
          :host(.wz-bg-light:not(.wz-has-login-image)) #glockoma-credit b,
          :host(.wz-bg-light:not(.wz-has-login-image)) #glockoma-credit a,
          :host(.wz-bg-light:not(.wz-has-login-image)) #version-link {
            color: var(--wz-bg-ink, #3a3a3a) !important; text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4) !important;
          }

          /* Settings panel opens in the middle of the screen */
          :host(:not(.in-game)) #settings-panel {
            left: 0 !important;
            right: 0;
            top: 46px;
            bottom: 0 !important;
            margin: auto;
            height: fit-content;
            transform-origin: center;
            z-index: 1002 !important;
            background: var(--wz-card) !important;
            border: 1px solid rgba(0, 0, 0, 0.12) !important;
            box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45) !important;
          }
          :host(.dark-mode:not(.in-game)) #settings-panel { background: var(--wz-card) !important; }
          /* as wide as the login box, so the box doesn't peek out at the sides */
          :host(:not(.in-game)) #settings-panel { width: min(372px, calc(100% - 28px)) !important; box-sizing: border-box; }
          /* labels that must stay on one line */
          .wz-fixed-label { flex: 0 0 122px !important; white-space: nowrap; }
          /* buttons next to a box are as tall as the box */
          #settings-panel .wz-row > .wz-btn { align-self: stretch; display: inline-flex; align-items: center; justify-content: center; }
          #wz-preset-status:empty, #wz-icons-status:empty, #wz-reset-status:empty { display: none; }
          :host(:not(.in-game)) #settings-panel.show { max-height: min(540px, calc(100vh - 100px)) !important; }
          /* Keep the same layout in a small window (overrides the old small-screen mode) */
          @media (max-width: 950px), (max-height: 590px) {
            :host { display: grid !important; overflow: hidden; background-color: transparent !important; }
            #box-background { display: block !important; align-self: stretch !important; justify-self: stretch !important; height: auto !important; min-height: 0; }
            #box {
              background: none !important;
              border: none !important;
              box-shadow: none !important;
              max-width: none !important;
              width: auto !important;
            }
          }
          /* Login screen background: a very dark tint of the border colour */
          :host(:not(.in-game)) {
            background-color: var(--wz-bg, var(--theme-primary, #e83d52)) !important;
          }
          #player-login-text { color: var(--wz-title, var(--theme-primary)) !important; }
          #forgot-password-link, #create-account-btn { color: var(--wz-link, var(--theme-primary)) !important; }

          .wz-subhead {
            font-family: CCDigitalDelivery;
            font-size: 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
            opacity: .6;
            margin: 12px 0 6px;
            padding-top: 8px;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
          }
          .wz-part-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 6px;
          }
          .wz-part-label { flex: 1; font-family: CCDigitalDelivery; font-size: 11px; }
          .wz-part-color {
            width: 34px; height: 22px; padding: 0;
            border: 1px solid rgba(0, 0, 0, 0.15); border-radius: 4px; cursor: pointer;
          }
          .wz-part-lock {
            width: 28px; height: 24px; padding: 0;
            display: inline-flex; align-items: center; justify-content: center;
            border-radius: 6px; cursor: pointer; border: none;
            background: var(--theme-primary); color: #fff;
            transition: opacity .15s ease, filter .15s ease;
          }
          .wz-part-lock:hover { filter: brightness(1.1); }
          .wz-fontprev { margin: 2px 0 8px; padding: 8px 10px; border-radius: 8px; border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.14)); background: var(--wz-field, rgba(255, 255, 255, 0.5)); font-size: 14px; line-height: 1.4; color: var(--wz-text); }
          .wz-share { gap: 10px; align-items: center; }
          .wz-share-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
          .wz-share-text small { font-size: 10.5px; font-weight: normal; opacity: .8; line-height: 1.3; }
          .wz-part-lock.wz-sharelock { width: 32px; height: 30px; flex: 0 0 32px; }
          .wz-sharelock.is-auto { opacity: .55; }
          .wz-sharelock.is-auto .wz-lock-open { display: block; }
          .wz-sharelock.is-auto .wz-lock-closed { display: none; }
          .wz-share.is-on { box-shadow: inset 0 0 0 1.5px var(--theme-primary); }
          .wz-part-lock .wz-lock-open { display: none; }
          .wz-part-row.is-auto .wz-part-lock { opacity: .35; }
          .wz-part-row.is-auto .wz-part-lock .wz-lock-open { display: block; }
          .wz-part-row.is-auto .wz-part-lock .wz-lock-closed { display: none; }
          .wz-part-row.is-auto .wz-part-color { opacity: .55; }
          .wz-btn.wz-btn.wz-rst { width: 28px !important; min-width: 28px !important; height: 24px !important; padding: 0 !important; flex: 0 0 28px !important; display: inline-flex; align-items: center; justify-content: center; }
          .wz-rst svg { width: 13px; height: 13px; }
          .wz-btn.wz-rst.is-default { opacity: .3; pointer-events: none; }
          :host(.in-game) .icon-button {
            background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.18) 49%, rgba(0,0,0,0.06) 50%, rgba(255,255,255,0.12) 100%), var(--wz-ui, var(--theme-primary)) !important;
            border-radius: 4px !important;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.55) !important;
            border-color: rgba(0, 0, 0, 0.15) !important;
            color: #ffffff;
          }
          .wz-hint { font-family: CCDigitalDelivery; font-size: 9.5px; opacity: .6; line-height: 1.35; }
          .wz-row { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
          .wz-range {
            -webkit-appearance: none; appearance: none; flex: 1; height: 6px; border-radius: 6px;
            background: linear-gradient(90deg, rgba(0,0,0,0.12), var(--theme-primary)); outline: none; cursor: pointer; margin: 0;
          }
          .wz-range::-webkit-slider-thumb {
            -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%;
            background: #fff; border: 2px solid var(--theme-primary); box-shadow: 0 1px 3px rgba(0,0,0,0.35);
          }
          .wz-range-value { width: 38px; text-align: right; font-family: CCDigitalDelivery; font-size: 12px; opacity: .8; }

          /* Banana Jam: optional picture behind the login screen */
          :host(:not(.in-game)) { position: relative; isolation: isolate; overflow: hidden !important; }
          #wz-login-bg {
            position: absolute; inset: 0; overflow: hidden; z-index: -1;
            pointer-events: none; display: none;
          }
          :host(.wz-has-login-image:not(.in-game)) #wz-login-bg { display: block; }
          #wz-login-bg-inner {
            position: absolute; inset: 0;
            transform-origin: var(--wz-login-x, 50%) var(--wz-login-y, 50%);
            transform: scale(var(--wz-login-scale, 1));
            filter: blur(var(--wz-login-blur, 0px));
            transition: filter .3s ease;
          }
          #wz-login-bg-img {
            position: absolute; inset: 0;
            background-image: var(--wz-login-image, none);
            background-size: cover; background-repeat: no-repeat;
            background-position: var(--wz-login-x, 50%) var(--wz-login-y, 50%);
            transform: scale(var(--wz-login-sx, 1), var(--wz-login-sy, 1));
          }
          .wz-fold-head {
            display: flex !important; align-items: center; justify-content: space-between;
            cursor: pointer; user-select: none;
            padding: 8px 10px !important; border-radius: 8px;
            background: color-mix(in srgb, var(--wz-text) 7%, transparent); opacity: 1 !important;
            border-top: none !important;
          }
          .wz-fold-head:hover { background: color-mix(in srgb, var(--wz-text) 12%, transparent); }
          .wz-fold-ttl { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
          .wz-fold-ttl small { font-size: 10.5px; font-weight: normal; letter-spacing: 0; text-transform: none; opacity: .95; line-height: 1.3; }
          /* ---- sections open as a pop-up on top of Settings ---- */
          .wz-fold-head .wz-fold-chevron { transform: none !important; font-size: 20px !important; line-height: 1; }
          .wz-pop-dim { position: absolute; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 10px; border-radius: inherit; background: rgba(0, 0, 0, 0.04); }
          .wz-pop-card { width: 100%; max-height: 100%; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
            background: var(--wz-card); color: var(--wz-text); border: 1px solid rgba(0, 0, 0, 0.35); border-radius: var(--wz-radius, 10px); box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22); }
          .wz-pop-head { flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; padding: 8px 8px 8px 14px; font-weight: bold;
            background: var(--theme-primary); color: var(--wz-on-primary, #fff); text-shadow: 0 1px 1px rgba(0, 0, 0, 0.25); }
          .wz-pop-x { width: 24px; height: 24px; border-radius: 50%; border: 0; cursor: pointer; background: rgba(255, 255, 255, 0.28); color: inherit; font-size: 12px; line-height: 1; padding: 0; }
          .wz-pop-x:hover { background: rgba(255, 255, 255, 0.5); }
          /* the drop-downs in pop-ups get enough room to show their whole name */
          .wz-pop-card .wz-fixed-label { flex: 0 0 96px !important; white-space: normal; line-height: 1.15; }
          .wz-pop-card .wz-row select.wz-input { min-width: 120px; text-overflow: ellipsis; }
          .wz-pop-body { padding: 8px 12px 2px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
          .wz-pop-body > .wz-fold-body { padding: 0; }
          .wz-pop-foot { flex-shrink: 0; display: flex; justify-content: flex-end; padding: 6px 12px 12px; }
          :host(.wz-style-bubble) .wz-pop-head { border-radius: 0; background: linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.12) 49%, rgba(0, 0, 0, 0.05) 50%, rgba(255, 255, 255, 0.1) 100%), var(--theme-primary); }
          :host(.wz-style-bubble) .wz-pop-x { background: linear-gradient(180deg, #fff, #eee); color: var(--theme-primary); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); }
          :host(.wz-style-comic) .wz-pop-head { border-bottom: 2.5px solid var(--cm-ink); color: var(--wz-text); text-shadow: none; background: color-mix(in srgb, var(--theme-primary) 45%, var(--wz-card)); }
          :host(.wz-style-comic) .wz-pop-x { border: 2px solid var(--cm-ink); background: var(--wz-card); color: var(--cm-ink); }
          :host(.wz-style-modern) .wz-pop-head { background: transparent; color: var(--wz-text); text-shadow: none; border-bottom: 1px solid rgba(128, 128, 128, 0.25); }
          :host(.wz-style-modern) .wz-pop-x { background: rgba(128, 128, 128, 0.18); }
          .wz-fold-chevron { font-size: 14px; transition: transform .2s ease; transform: rotate(-90deg); opacity: .7; }
          .wz-fold-head.open .wz-fold-chevron { transform: rotate(0deg); }
          .wz-fold-body { padding: 8px 2px 4px; }
          /* ---- Banana Jam: one shared look for the login box, Settings and the colour picker ---- */
          :host {
            --wz-card: #fff5e6;
            --wz-field: #fffbf2;
            --wz-field-border: rgba(110, 75, 55, 0.18);
            --wz-text: #4a3526;
            --wz-muted: rgba(74, 53, 38, 0.65);
            --wz-radius: 18px;
            --wz-field-radius: 10px;
            --wz-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
          }
          :host(.dark-mode) {
            --wz-card: #2d2d2d;
            --wz-field: #3a3a3a;
            --wz-field-border: rgba(255, 255, 255, 0.12);
            --wz-text: #e8e8e8;
            --wz-muted: rgba(232, 232, 232, 0.6);
          }
          #box-background, :host(.dark-mode) #box-background { border-radius: var(--wz-radius) !important; box-shadow: var(--wz-shadow) !important; }
          #settings-panel {
            background: var(--wz-card) !important;
            border-radius: var(--wz-radius) !important;
            box-shadow: var(--wz-shadow) !important;
            border: 1px solid rgba(0, 0, 0, 0.08) !important;
            color: var(--wz-text);
          }
          ajd-text-input { background-color: var(--wz-field) !important; border-radius: var(--wz-field-radius) !important; }
          #settings-panel select,
          #settings-panel input[type="text"],
          #custom-theme-color-container input[type="text"],
          #custom-theme-color-container select,
          .wz-input ,
          #custom-theme-color-container-2 input[type="text"],
          #custom-theme-color-container-2 select{
            background-color: var(--wz-field) !important;
            color: var(--wz-text) !important;
            border: 1.5px solid var(--wz-field-border) !important;
            border-radius: var(--wz-field-radius) !important;
            color-scheme: light;
          }
          :host(.dark-mode) #settings-panel select, :host(.dark-mode) .wz-input { color-scheme: dark; }
          /* the open drop-down list always uses the panel colours (never light text on a white list) */
          #settings-panel select option, #settings-panel select optgroup, .wz-input option, .wz-input optgroup,
          #custom-theme-color-container-2 select option, #custom-theme-color-container-2 select optgroup {
            background-color: var(--wz-card, #2b2d33) !important; color: var(--wz-text) !important;
          }
          .wz-btn, #reset-custom-theme-color-btn {
            background: var(--wz-field) !important;
            color: var(--wz-text) !important;
            border: 1.5px solid var(--wz-field-border) !important;
            border-radius: var(--wz-field-radius) !important;
          }
          .wz-btn:hover { filter: brightness(0.96); }
          #settings-panel .settings-item, #settings-panel .settings-item span, #settings-panel label,
          #settings-panel .wz-part-label, #settings-panel .wz-minilabel, #settings-panel .settings-tab:not(.active) { color: var(--wz-text) !important; }
          #settings-panel .wz-hint, #settings-panel .wz-subhead, #settings-panel h5, #settings-panel .wz-range-value { color: var(--wz-muted) !important; }
          .wz-btn-main, .wz-toggle-btn.on { background: var(--theme-primary) !important; color: #fff !important; border-color: transparent !important; }
          #settings-panel #custom-theme-color-container ,
          #settings-panel #custom-theme-color-container-2 { background: none !important; padding: 0 !important; border-radius: 0 !important; margin-top: 0 !important; }
          .wz-section {
            background: color-mix(in srgb, var(--wz-text) 6%, transparent);
            border: 1px solid color-mix(in srgb, var(--wz-text) 8%, transparent);
            border-radius: 14px;
            padding: 4px 10px;
            margin: 10px 0 0;
          }
          .wz-section .wz-fold-head { background: none !important; margin: 0 -6px !important; padding: 10px 6px !important; }
          .wz-section .wz-fold-head:hover { background: color-mix(in srgb, var(--wz-text) 6%, transparent) !important; }
          .wz-section .wz-fold-body { padding: 2px 0 10px; }
          .settings-subsection .wz-section { margin-top: 8px; }
          .wz-part-color, #custom-theme-color-picker { border: 1.5px solid var(--wz-field-border) !important; }
          .wz-minilabel { font-family: CCDigitalDelivery; font-size: 12px; font-weight: bold; opacity: .8; margin: 10px 0 6px; }
          .wz-subhead.wz-top { margin-top: 0 !important; }
          .wz-outer { padding: 0 2px; }
          .wz-toggle-btn.on { background: var(--theme-primary) !important; color: #fff !important; border-color: transparent !important; }
          .wz-adjust { padding: 8px 0 2px; }
          .wz-input {
            min-width: 0; padding: 4px 8px; border-radius: 4px;
            border: 1px solid rgba(255,255,255,0.12); background-color: #1e1f2e; color: #C3C3C3;
            font-family: CCDigitalDelivery; font-size: 11px; color-scheme: dark;
          }
          .wz-btn {
            padding: 4px 9px; border-radius: 5px; cursor: pointer;
            border: 1px solid rgba(0, 0, 0, 0.15); background: rgba(0, 0, 0, 0.05);
            font-family: CCDigitalDelivery; font-size: 10.5px; color: inherit; white-space: nowrap;
          }
          .wz-btn:hover { filter: brightness(0.95); background: rgba(0, 0, 0, 0.09); }
          .wz-btn-main { background: var(--theme-primary); color: #fff; border-color: transparent; }
          .wz-btn-main:hover { background: var(--theme-primary); filter: brightness(1.1); }
          /* ---- Banana Jam: easier-to-read settings panel ---- */
          #settings-panel {
            width: 320px !important;
            padding: 18px 16px 16px !important;
            border-radius: 16px !important;
          }
          #settings-panel h3 { font-size: 22px !important; margin-bottom: 12px !important; }
          .settings-tab { font-size: 14px !important; padding: 9px 12px !important; }
          .settings-item { font-size: 14px !important; padding: 9px 4px !important; }
          .settings-subsection h5 { font-size: 11.5px !important; letter-spacing: 1px; margin: 14px 0 6px !important; }
          .wz-subhead { font-size: 11.5px !important; opacity: .75 !important; margin: 16px 0 8px !important; }
          .wz-part-label { font-size: 13.5px !important; }
          .wz-part-row, .wz-row { margin-bottom: 9px !important; gap: 8px !important; }
          .wz-part-color { width: 40px !important; height: 26px !important; border-radius: 7px !important; }
          .wz-part-lock { width: 32px !important; height: 26px !important; border-radius: 7px !important; }
          .wz-hint { font-size: 11px !important; opacity: .7 !important; line-height: 1.45 !important; }
          .wz-input { font-size: 13px !important; padding: 6px 9px !important; border-radius: 7px !important; }
          .wz-btn { font-size: 12.5px !important; padding: 6px 11px !important; border-radius: 7px !important; }
          /* ---- Banana Jam: tidy alignment (one heading style, one hint style, same-size controls) ---- */
          .settings-subsection h5, .wz-subhead.wz-top {
            font-size: 11.5px !important; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;
            opacity: .75 !important; margin: 16px 0 8px !important;
          }
          .settings-subsection:first-child h5 { margin-top: 4px !important; }
          .wz-item-hint { margin: -4px 4px 10px; }
          .wz-warn {
            margin: -2px 0 10px; padding: 7px 9px; border-radius: 7px; font-size: 11px; line-height: 1.4;
            background: rgba(255, 217, 0, 0.1); border-left: 3px solid rgba(255, 176, 0, 0.6);
          }
          .wz-flabel { display: block; font-family: CCDigitalDelivery; font-size: 12px; font-weight: bold; margin: 0 0 5px; }
          .wz-full { width: 100%; box-sizing: border-box; }
          .wz-select-right { max-width: 150px; }
          .settings-item { min-height: 40px; }
          .settings-toggle { min-width: 38px; }
          #settings-panel .wz-row > .wz-input, #settings-panel .wz-row > .wz-btn { min-height: 32px; box-sizing: border-box; }
          #custom-theme-color-container ,
          #custom-theme-color-container-2 { padding: 12px !important; border-radius: 10px !important; }
          #custom-theme-color-container label ,
          #custom-theme-color-container-2 label { font-size: 13px !important; margin-bottom: 6px !important; }
          #custom-theme-color-container input[type="text"],
          #custom-theme-color-container select ,
          #custom-theme-color-container-2 input[type="text"],
          #custom-theme-color-container-2 select { font-size: 13px !important; padding: 6px 9px !important; border-radius: 7px !important; }
          #custom-theme-color-picker { width: 44px !important; height: 32px !important; border-radius: 8px !important; }
          #reset-custom-theme-color-btn { font-size: 12px !important; padding: 5px 10px !important; }
          /* ================= Banana Jam: Windows Vista / 7 "Aero" look ================= */
          :host {
            --vx-glass: color-mix(in srgb, var(--theme-primary) 30%, rgba(255, 255, 255, 0.55));
            --vx-frame: 0 0 0 1px rgba(0, 0, 0, 0.45), 0 0 0 7px var(--vx-glass), 0 0 0 8px rgba(0, 0, 0, 0.4), 0 14px 34px rgba(0, 0, 0, 0.4);
            --vx-radius: 6px;
            --vx-btn-face: linear-gradient(180deg, #f6f6f6 0%, #ebebeb 48%, #dddddd 50%, #cfcfcf 100%);
            --vx-btn-hover: linear-gradient(180deg, #eaf6fd 0%, #d9f0fc 48%, #bee6fd 50%, #a7d9f5 100%);
          }
          /* login box and settings panel: glassy window edge */
          #box-background, :host(.dark-mode) #box-background {
            border-radius: var(--vx-radius) !important;
            box-shadow: var(--vx-frame), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            border: none !important;
          }
          #settings-panel {
            border-radius: var(--vx-radius) !important;
            box-shadow: var(--vx-frame), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            border: none !important;
          }
          /* text boxes: white with the classic grey edge and a blue glow when typing */
          ajd-text-input {
            border: 1px solid #abadb3 !important;
            border-top-color: #707070 !important;
            border-radius: 3px !important;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.08) !important;
          }
          ajd-text-input:focus-within { border-color: #3d7bad !important; box-shadow: 0 0 0 2px rgba(77, 160, 230, 0.35) !important; }
          #settings-panel select, #settings-panel input[type="text"], .wz-input,
          #custom-theme-color-container input[type="text"], #custom-theme-color-container select ,
          #custom-theme-color-container-2 input[type="text"], #custom-theme-color-container-2 select {
            border: 1px solid #abadb3 !important;
            border-top-color: #8a8a8a !important;
            border-radius: 3px !important;
            box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
          }
          /* glossy main buttons (Log In, Save), in the theme colour */
          #log-in-btn {
            border-radius: 4px !important;
            border: 1px solid color-mix(in srgb, var(--ajd-bubble-button-background-color, var(--theme-primary)) 60%, #000) !important;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.18) 49%, rgba(0, 0, 0, 0.06) 50%, rgba(255, 255, 255, 0.12) 100%),
              var(--ajd-bubble-button-background-color, var(--theme-primary)) !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.2) !important;
            text-shadow: 0 1px 1px rgba(0, 0, 0, 0.45);
            transition: box-shadow .15s ease, filter .15s ease !important;
          }
          #log-in-btn:hover { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 8px color-mix(in srgb, var(--theme-primary) 60%, #7fd0ff) !important; filter: brightness(1.05); }
          .wz-btn-main, .wz-toggle-btn.on, .wz-part-lock {
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.15) 49%, rgba(0, 0, 0, 0.06) 50%, rgba(255, 255, 255, 0.1) 100%),
              var(--theme-primary) !important;
            border: 1px solid color-mix(in srgb, var(--theme-primary) 60%, #000) !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55) !important;
            color: #fff !important;
            text-shadow: 0 1px 1px rgba(0, 0, 0, 0.4);
            border-radius: 3px !important;
          }
          /* normal buttons: the silver Vista button that glows blue on hover */
          .wz-btn:not(.wz-btn-main):not(.on), #reset-custom-theme-color-btn, .icon-button {
            background: var(--vx-btn-face) !important;
            border: 1px solid #707070 !important;
            border-radius: 3px !important;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.75) !important;
            color: #1e1e1e !important;
          }
          .wz-btn:not(.wz-btn-main):not(.on):hover, #reset-custom-theme-color-btn:hover, .icon-button:hover {
            background: var(--vx-btn-hover) !important;
            border-color: #3c7fb1 !important;
            filter: none !important;
          }
          /* settings sections: Vista group boxes */
          .wz-section {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.25)) , color-mix(in srgb, var(--wz-text) 4%, transparent) !important;
            border: 1px solid color-mix(in srgb, var(--wz-text) 22%, transparent) !important;
            border-radius: 4px !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
          }
          :host(.wz-card-dark) .wz-section, :host(.dark-mode:not(.wz-card-light)) .wz-section {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02)) !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
          }
          #settings-panel .wz-section .wz-fold-head { color: color-mix(in srgb, var(--theme-primary) 75%, var(--wz-text)) !important; font-weight: bold; letter-spacing: .5px; }
          /* tabs: Vista style tabs */
          .settings-tabs { border-bottom: none !important; gap: 4px !important; padding-bottom: 2px; }
          .settings-tab {
            background: linear-gradient(180deg, #f7f7f7, #e3e3e3) !important;
            border: 1px solid #898c95 !important; border-bottom: 1px solid #898c95 !important;
            border-radius: 3px !important; margin-bottom: 0 !important;
            color: #1e1e1e !important;
          }
          .settings-tab:hover { background: var(--vx-btn-hover) !important; }
          .settings-tab.active { background: var(--wz-card) !important; color: var(--theme-primary) !important; border: 1px solid var(--theme-primary) !important; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7) !important; }
          /* switches: glossy pill */
          .settings-toggle {
            background: linear-gradient(180deg, #d9d9d9, #b5b5b5) !important;
            border: 1px solid #707070; box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.25);
          }
          .settings-peer:checked ~ .settings-toggle {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.15) 49%, rgba(0, 0, 0, 0.05) 50%), var(--theme-primary) !important;
            border-color: color-mix(in srgb, var(--theme-primary) 60%, #000);
          }
          .settings-toggle::after { background: linear-gradient(180deg, #ffffff, #dcdcdc) !important; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.45) !important; }
          /* sliders: thin sunken track with a glossy handle */
          .wz-range { height: 4px !important; background: linear-gradient(180deg, #b8b8b8, #e8e8e8) !important; border: 1px solid #8e8f8f; border-radius: 2px !important; }
          .wz-range::-webkit-slider-thumb {
            width: 11px !important; height: 20px !important; border-radius: 3px !important;
            background: linear-gradient(180deg, #fdfdfd 0%, #e8e8e8 48%, #d6d6d6 50%, #c9c9c9 100%) !important;
            border: 1px solid #707070 !important; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8) !important;
          }
          .wz-range::-webkit-slider-thumb:hover { background: var(--vx-btn-hover) !important; border-color: #3c7fb1 !important; }
          /* account chips and add button */
          .wz-part-color, #custom-theme-color-picker { border: 1px solid #707070 !important; border-radius: 3px !important; box-shadow: inset 0 0 0 1px #fff !important; }
          /* Help "?" button: round glossy blue, like the old Windows help icon */
          .icon-button.wz-help-btn, :host(.in-game) .icon-button.wz-help-btn {
            width: 30px !important; height: 30px !important; min-width: 30px; padding: 0 !important;
            border-radius: 50% !important; border: 1px solid #0d3f80 !important;
            background: radial-gradient(circle at 35% 28%, #b5dcff 0%, #3a8ee6 50%, #1a58ad 100%) !important;
            box-shadow: inset 0 0 0 1px rgba(255,255,255,.5), 0 1px 3px rgba(0,0,0,.35) !important;
            color: #fff !important; font: italic 700 17px Georgia, "Times New Roman", serif !important;
            text-shadow: 0 1px 1px rgba(0,0,0,.45); line-height: 1 !important; cursor: pointer;
            display: inline-flex !important; align-items: center; justify-content: center;
          }
          .icon-button.wz-help-btn:hover { filter: brightness(1.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.6), 0 0 8px rgba(80,170,255,.8) !important; }
          /* My icons: your own pictures next to the fruits */
          .wz-icons { margin-top: 8px; padding: 8px; border: 1px solid var(--wz-field-border, rgba(0,0,0,.15)); border-radius: 4px; background: var(--wz-field, rgba(255,255,255,.5)); }
          .wz-icons-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-family: CCDigitalDelivery; font-size: 12.5px; margin-bottom: 6px; }
          .wz-icons-list { display: flex; flex-wrap: wrap; gap: 6px; min-height: 34px; align-items: center; }
          .wz-icons-empty { font-family: CCDigitalDelivery; font-size: 11.5px; color: var(--wz-muted); }
          .wz-icon-tile {
            position: relative; width: 34px; height: 34px; border-radius: 3px; cursor: pointer; box-sizing: border-box;
            border: 1px solid rgba(0, 0, 0, 0.3); background: linear-gradient(180deg, #ffffff, #ececec);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8); display: flex; align-items: center; justify-content: center;
          }
          .wz-icon-tile img { max-width: 26px; max-height: 26px; }
          .wz-icon-tile:hover { border-color: #3c7fb1; box-shadow: inset 0 0 0 1px rgba(255,255,255,.8), 0 0 5px rgba(80, 160, 230, 0.8); }
          .wz-icon-tile.on { border: 2px solid #3c7fb1; background: linear-gradient(180deg, #eaf6fd, #bee6fd); }
          .wz-icon-del {
            position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; padding: 0; border-radius: 50%;
            border: 1px solid #7d1d0e; color: #fff; font: bold 9px/14px "Segoe UI", Tahoma, sans-serif; cursor: pointer;
            background: linear-gradient(180deg, #f0a28e 0%, #d8492e 49%, #c1341a 50%, #e76b4b 100%); display: none;
          }
          .wz-icon-tile:hover .wz-icon-del { display: block; }
          /* ================= Banana Jam: Modern look (sleek and flat) ================= */
          :host(.wz-style-modern) #box-background, :host(.wz-style-modern) #settings-panel, :host(.wz-style-modern) .wz-pop-card {
            border-radius: 16px !important; border: 1px solid rgba(0, 0, 0, 0.08) !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08), 0 16px 40px rgba(0, 0, 0, 0.18) !important;
          }
          :host(.wz-style-modern) ajd-text-input { border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.14)) !important; border-radius: 10px !important; box-shadow: none !important; }
          :host(.wz-style-modern) ajd-text-input:focus-within { border-color: var(--theme-primary) !important; box-shadow: 0 0 0 3px var(--theme-secondary) !important; }
          :host(.wz-style-modern) #settings-panel select, :host(.wz-style-modern) #settings-panel input[type="text"], :host(.wz-style-modern) .wz-input,
          :host(.wz-style-modern) #custom-theme-color-container input[type="text"], :host(.wz-style-modern) #custom-theme-color-container select ,
          :host(.wz-style-modern) #custom-theme-color-container-2 input[type="text"], :host(.wz-style-modern) #custom-theme-color-container-2 select {
            border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.14)) !important; border-radius: 8px !important; box-shadow: none !important;
          }
          :host(.wz-style-modern) #log-in-btn {
            border-radius: 10px !important; border: 1px solid transparent !important; text-shadow: none;
            background: var(--ajd-bubble-button-background-color, var(--theme-primary)) !important;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18) !important;
          }
          :host(.wz-style-modern) #log-in-btn:hover { box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18) !important; filter: brightness(1.06); }
          :host(.wz-style-modern) .wz-btn-main, :host(.wz-style-modern) .wz-toggle-btn.on, :host(.wz-style-modern) .wz-part-lock {
            background: var(--theme-primary) !important; border: 1px solid transparent !important;
            box-shadow: none !important; text-shadow: none; border-radius: 8px !important;
          }
          :host(.wz-style-modern) .wz-btn:not(.wz-btn-main):not(.on), :host(.wz-style-modern) #reset-custom-theme-color-btn, :host(.wz-style-modern) .icon-button {
            background: var(--wz-field, #ffffff) !important; border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.12)) !important;
            border-radius: 8px !important; box-shadow: none !important; color: var(--wz-text, #222) !important;
          }
          :host(.wz-style-modern) .icon-button { border-radius: 10px !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important; }
          :host(.wz-style-modern) .wz-btn:not(.wz-btn-main):not(.on):hover, :host(.wz-style-modern) #reset-custom-theme-color-btn:hover, :host(.wz-style-modern) .icon-button:hover {
            background: rgba(128, 128, 128, 0.14) !important; border-color: var(--wz-field-border, rgba(0, 0, 0, 0.12)) !important;
          }
          :host(.wz-style-modern.in-game) .icon-button { background: var(--wz-ui, var(--theme-primary)) !important; border: 1px solid transparent !important; color: #fff !important; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important; }
          :host(.wz-style-modern) .wz-section { background: transparent !important; border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.1)) !important; border-radius: 12px !important; box-shadow: none !important; }
          :host(.wz-style-modern) #settings-panel .wz-section .wz-fold-head { color: var(--theme-primary) !important; font-weight: 600; letter-spacing: .3px; }
          :host(.wz-style-modern) .settings-tabs { border-bottom: none !important; background: rgba(128, 128, 128, 0.14); border-radius: 10px; padding: 3px; gap: 2px !important; }
          :host(.wz-style-modern) .settings-tab { background: transparent !important; border: none !important; border-radius: 8px !important; margin-bottom: 0; color: var(--wz-muted) !important; }
          :host(.wz-style-modern) .settings-tab:hover { background: rgba(128, 128, 128, 0.12) !important; }
          :host(.wz-style-modern) .settings-tab.active { background: var(--wz-card) !important; color: var(--wz-text) !important; border: none !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16); }
          :host(.wz-style-modern) .settings-toggle { background: rgba(128, 128, 128, 0.38) !important; border: 1px solid transparent; box-shadow: none; }
          :host(.wz-style-modern) .settings-peer:checked ~ .settings-toggle { background: var(--theme-primary) !important; border-color: transparent; }
          :host(.wz-style-modern) .settings-toggle::after { background: #ffffff !important; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important; }
          :host(.wz-style-modern) .wz-range { height: 4px !important; background: rgba(128, 128, 128, 0.32) !important; border: none; border-radius: 99px !important; }
          :host(.wz-style-modern) .wz-range::-webkit-slider-thumb, :host(.wz-style-modern) .wz-range::-webkit-slider-thumb:hover {
            width: 16px !important; height: 16px !important; border-radius: 50% !important; background: #ffffff !important;
            border: 2px solid var(--theme-primary) !important; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
          }
          :host(.wz-style-modern) .wz-part-color, :host(.wz-style-modern) #custom-theme-color-picker { border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.14)) !important; border-radius: 8px !important; box-shadow: none !important; }
          :host(.wz-style-modern) .icon-button.wz-help-btn {
            background: var(--wz-field, #fff) !important; border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.12)) !important;
            color: var(--theme-primary) !important; font: 700 16px "Segoe UI", Tahoma, sans-serif !important; text-shadow: none; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12) !important;
          }
          :host(.wz-style-modern) .wz-icon-tile { border-radius: 8px; background: var(--wz-field, #fff); border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.12)); box-shadow: none; }
          :host(.wz-style-modern) .wz-icon-tile.on { border: 2px solid var(--theme-primary); background: var(--theme-secondary); }
          :host(.wz-style-modern) .wz-icons { border-radius: 10px; }

          /* ================= Banana Jam: Bubble look (soft, shiny 3D with a gentle glow) ================= */
          :host(.wz-style-bubble) { --bub-glow: var(--theme-secondary, rgba(255, 255, 255, 0.45)); }
          :host(.wz-style-bubble) #box-background, :host(.wz-style-bubble) #settings-panel, :host(.wz-style-bubble) .wz-pop-card {
            border-radius: 30px !important; border: 2px solid rgba(255, 255, 255, 0.9) !important;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 0 30px var(--bub-glow), 0 16px 36px rgba(0, 0, 0, 0.2),
              inset 0 3px 0 rgba(255, 255, 255, 0.75), inset 0 -6px 12px rgba(0, 0, 0, 0.05) !important;
          }
          :host(.wz-style-bubble) ajd-text-input { border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.1)) !important; border-radius: 20px !important; box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.07), 0 1px 0 rgba(255, 255, 255, 0.8) !important; }
          :host(.wz-style-bubble) ajd-text-input:focus-within { border-color: var(--theme-primary) !important; box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.05), 0 0 0 4px var(--bub-glow), 0 0 16px var(--bub-glow) !important; }
          :host(.wz-style-bubble) #settings-panel select, :host(.wz-style-bubble) #settings-panel input[type="text"], :host(.wz-style-bubble) .wz-input,
          :host(.wz-style-bubble) #custom-theme-color-container input[type="text"], :host(.wz-style-bubble) #custom-theme-color-container select ,
          :host(.wz-style-bubble) #custom-theme-color-container-2 input[type="text"], :host(.wz-style-bubble) #custom-theme-color-container-2 select {
            border: 1px solid var(--wz-field-border, rgba(0, 0, 0, 0.1)) !important; border-radius: 16px !important; box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.07) !important;
          }
          :host(.wz-style-bubble) #log-in-btn {
            border-radius: 999px !important; border: 1px solid rgba(255, 255, 255, 0.7) !important;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 51%), var(--ajd-bubble-button-background-color, var(--theme-primary)) !important;
            box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.2), inset 0 2px 2px rgba(255, 255, 255, 0.5), 0 5px 12px rgba(0, 0, 0, 0.18), 0 0 18px var(--bub-glow) !important;
            transition: transform .15s ease, filter .15s ease, box-shadow .15s ease !important;
          }
          :host(.wz-style-bubble) #log-in-btn:hover { transform: translateY(-1px) scale(1.02); filter: brightness(1.06);
            box-shadow: inset 0 -4px 8px rgba(0, 0, 0, 0.18), inset 0 2px 2px rgba(255, 255, 255, 0.55), 0 7px 16px rgba(0, 0, 0, 0.18), 0 0 28px var(--bub-glow) !important; }
          :host(.wz-style-bubble) #log-in-btn:active { transform: scale(0.98); }
          :host(.wz-style-bubble) .wz-btn-main, :host(.wz-style-bubble) .wz-toggle-btn.on, :host(.wz-style-bubble) .wz-part-lock {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 51%), var(--theme-primary) !important; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.7) !important; border-radius: 999px !important;
            box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.18), 0 3px 7px rgba(0, 0, 0, 0.15), 0 0 12px var(--bub-glow) !important;
          }
          :host(.wz-style-bubble) .wz-btn:not(.wz-btn-main):not(.on), :host(.wz-style-bubble) #reset-custom-theme-color-btn, :host(.wz-style-bubble) .icon-button {
            background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 50%, #ececec 51%, #f5f5f5 100%) !important; text-shadow: none;
            border: 1px solid rgba(255, 255, 255, 0.95) !important; border-radius: 999px !important; color: #4a4a4a !important;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1), inset 0 -3px 5px rgba(0, 0, 0, 0.06), 0 3px 7px rgba(0, 0, 0, 0.12) !important;
            transition: transform .15s ease, box-shadow .15s ease !important;
          }
          :host(.wz-style-bubble) .icon-button { border-radius: 16px !important; }
          :host(.wz-style-bubble) .wz-btn:hover, :host(.wz-style-bubble) #reset-custom-theme-color-btn:hover, :host(.wz-style-bubble) .icon-button:hover {
            transform: translateY(-1px) scale(1.04);
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 4px 10px rgba(0, 0, 0, 0.14), 0 0 16px var(--bub-glow) !important;
          }
          :host(.wz-style-bubble) .wz-btn:active, :host(.wz-style-bubble) #reset-custom-theme-color-btn:active, :host(.wz-style-bubble) .icon-button:active { transform: scale(0.97); }
          :host(.wz-style-bubble.in-game) .icon-button {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 51%), var(--wz-ui, var(--theme-primary)) !important;
            color: #fff !important; border: 1px solid rgba(255, 255, 255, 0.8) !important;
            box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.25), 0 3px 8px rgba(0, 0, 0, 0.3), 0 0 14px rgba(255, 255, 255, 0.35) !important;
          }
          :host(.wz-style-bubble) .wz-section {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0.4) 100%) !important;
            border: 1px solid rgba(255, 255, 255, 0.95) !important; border-radius: 22px !important;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05), 0 3px 10px rgba(0, 0, 0, 0.05), inset 0 -3px 6px rgba(0, 0, 0, 0.03) !important;
          }
          :host(.wz-style-bubble.wz-card-dark) .wz-section, :host(.wz-style-bubble.dark-mode:not(.wz-card-light)) .wz-section {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03)) !important; border-color: rgba(255, 255, 255, 0.1) !important;
          }
          :host(.wz-style-bubble) .wz-fold-head, :host(.wz-style-bubble) .wz-section .wz-fold-head { border-radius: 18px; }
          :host(.wz-style-bubble) #settings-panel .wz-section .wz-fold-head { color: var(--theme-primary) !important; font-weight: bold; }
          :host(.wz-style-bubble) .settings-tabs { border-bottom: none !important; gap: 6px !important; padding-bottom: 4px; }
          :host(.wz-style-bubble) .settings-tab {
            border: 1px solid rgba(255, 255, 255, 0.95) !important; border-radius: 999px !important; margin-bottom: 0;
            background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 50%, #ececec 51%, #f5f5f5 100%) !important; color: #555 !important;
            box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), inset 0 -2px 4px rgba(0, 0, 0, 0.05), 0 2px 5px rgba(0, 0, 0, 0.08);
          }
          :host(.wz-style-bubble) .settings-tab.active {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 51%), var(--theme-primary) !important; color: #ffffff !important; border-color: rgba(255, 255, 255, 0.7) !important;
            text-shadow: 0 1px 1px rgba(0, 0, 0, 0.2); box-shadow: inset 0 -3px 6px rgba(0, 0, 0, 0.18), 0 3px 7px rgba(0, 0, 0, 0.12), 0 0 14px var(--bub-glow);
          }
          :host(.wz-style-bubble) .settings-toggle { background: rgba(0, 0, 0, 0.12) !important; border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.2); }
          :host(.wz-style-bubble) .settings-peer:checked ~ .settings-toggle { background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 51%), var(--theme-primary) !important; box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.15), 0 0 12px var(--bub-glow); }
          :host(.wz-style-bubble) .settings-toggle::after { background: radial-gradient(circle at 50% 30%, #ffffff 0%, #f1f1f1 60%, #dcdcdc 100%) !important; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important; }
          :host(.wz-style-bubble) .wz-range { height: 10px !important; background: rgba(0, 0, 0, 0.1) !important; border: none; border-radius: 99px !important; box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 0 rgba(255, 255, 255, 0.8); }
          :host(.wz-style-bubble) .wz-range::-webkit-slider-thumb, :host(.wz-style-bubble) .wz-range::-webkit-slider-thumb:hover {
            width: 20px !important; height: 20px !important; border-radius: 50% !important;
            background: radial-gradient(circle at 50% 30%, #ffffff 0%, var(--theme-primary) 70%) !important;
            border: 2px solid #ffffff !important; box-shadow: inset 0 -2px 3px rgba(0, 0, 0, 0.15), 0 2px 5px rgba(0, 0, 0, 0.3), 0 0 10px var(--bub-glow) !important;
          }
          :host(.wz-style-bubble) .wz-part-color, :host(.wz-style-bubble) #custom-theme-color-picker { border: 2px solid #ffffff !important; border-radius: 14px !important; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.14), 0 0 10px var(--bub-glow) !important; }
          :host(.wz-style-bubble) .icon-button.wz-help-btn {
            border: 1px solid rgba(255, 255, 255, 0.9) !important; color: #ffffff !important; border-radius: 50% !important;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0) 51%), radial-gradient(circle at 50% 35%, #8cc8ff 0%, #3d8fe6 60%, #2166c2 100%) !important;
            box-shadow: inset 0 -3px 5px rgba(0, 0, 0, 0.2), 0 3px 7px rgba(0, 0, 0, 0.2), 0 0 14px rgba(90, 170, 255, 0.55) !important;
            font: 800 16px "Segoe UI", Tahoma, sans-serif !important; text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
          }
          :host(.wz-style-bubble) .wz-icon-tile { border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.95); background: linear-gradient(180deg, #ffffff 0%, #f7f7f7 50%, #ececec 51%, #f5f5f5 100%); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 5px rgba(0, 0, 0, 0.08); }
          :host(.wz-style-bubble) .wz-icon-tile:hover { box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 0 12px var(--bub-glow); }
          :host(.wz-style-bubble) .wz-icon-tile.on { border-color: var(--theme-primary); background: var(--theme-secondary); box-shadow: 0 0 0 1px var(--theme-primary), 0 0 14px var(--bub-glow); }
          :host(.wz-style-bubble) .wz-icons { border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.9); box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.05); }

          /* ================= Banana Jam: Comic look (soft 2D cartoon) =================
             Flat colours, soft ink outlines and little solid drop shadows, like a comic. */
          :host(.wz-style-comic) { --cm-ink: #3b2f2f; --cm-ink-soft: rgba(59, 47, 47, 0.85); --cm-ink-faint: rgba(59, 47, 47, 0.28); --cm-btn-text: #3b2f2f; }
          :host(.wz-style-comic.wz-card-dark), :host(.wz-style-comic.dark-mode:not(.wz-card-light)) {
            --cm-ink: #141012; --cm-ink-soft: rgba(0, 0, 0, 0.6); --cm-ink-faint: rgba(255, 255, 255, 0.16); --cm-btn-text: var(--wz-text, #f1ece6);
          }
          :host(.wz-style-comic) #box-background, :host(.wz-style-comic) #settings-panel, :host(.wz-style-comic) .wz-pop-card {
            border-radius: 22px !important; border: 2.5px solid var(--cm-ink) !important;
            box-shadow: 5px 5px 0 var(--cm-ink-soft) !important;
          }
          :host(.wz-style-comic) ajd-text-input { border: 2px solid var(--cm-ink) !important; border-radius: 12px !important; box-shadow: none !important; }
          :host(.wz-style-comic) ajd-text-input:focus-within { border-color: var(--cm-ink) !important; box-shadow: 0 0 0 3px var(--theme-secondary) !important; }
          :host(.wz-style-comic) #settings-panel select, :host(.wz-style-comic) #settings-panel input[type="text"], :host(.wz-style-comic) .wz-input,
          :host(.wz-style-comic) #custom-theme-color-container input[type="text"], :host(.wz-style-comic) #custom-theme-color-container select ,
          :host(.wz-style-comic) #custom-theme-color-container-2 input[type="text"], :host(.wz-style-comic) #custom-theme-color-container-2 select {
            border: 2px solid var(--cm-ink) !important; border-radius: 10px !important; box-shadow: none !important;
          }
          :host(.wz-style-comic) #log-in-btn {
            border-radius: 14px !important; border: 2.5px solid var(--cm-ink) !important;
            background: var(--ajd-bubble-button-background-color, var(--theme-primary)) !important;
            box-shadow: 3px 3px 0 var(--cm-ink) !important;
            transition: transform .1s ease, box-shadow .1s ease !important;
          }
          :host(.wz-style-comic) #log-in-btn:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 var(--cm-ink) !important; }
          :host(.wz-style-comic) #log-in-btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--cm-ink) !important; }
          :host(.wz-style-comic) .wz-btn-main, :host(.wz-style-comic) .wz-toggle-btn.on, :host(.wz-style-comic) .wz-part-lock {
            background: var(--theme-primary) !important; text-shadow: none;
            border: 2px solid var(--cm-ink) !important; border-radius: 10px !important;
            box-shadow: 2px 2px 0 var(--cm-ink) !important;
          }
          :host(.wz-style-comic) .wz-btn:not(.wz-btn-main):not(.on), :host(.wz-style-comic) #reset-custom-theme-color-btn, :host(.wz-style-comic) .icon-button {
            background: var(--wz-field, #ffffff) !important; text-shadow: none;
            border: 2px solid var(--cm-ink) !important; border-radius: 10px !important; color: var(--cm-btn-text) !important;
            box-shadow: 2px 2px 0 var(--cm-ink) !important;
            transition: transform .1s ease, box-shadow .1s ease !important;
          }
          :host(.wz-style-comic) .icon-button { border-radius: 12px !important; }
          :host(.wz-style-comic) .wz-btn:hover, :host(.wz-style-comic) #reset-custom-theme-color-btn:hover, :host(.wz-style-comic) .icon-button:hover {
            transform: translate(-1px, -1px); box-shadow: 3px 3px 0 var(--cm-ink) !important; filter: none;
          }
          :host(.wz-style-comic) .wz-btn:not(.wz-btn-main):not(.on):hover, :host(.wz-style-comic) #reset-custom-theme-color-btn:hover, :host(.wz-style-comic) .icon-button:hover {
            background: var(--theme-secondary, #ffffff) !important; border-color: var(--cm-ink) !important;
          }
          :host(.wz-style-comic) .wz-btn:active, :host(.wz-style-comic) #reset-custom-theme-color-btn:active, :host(.wz-style-comic) .icon-button:active {
            transform: translate(1px, 1px); box-shadow: 1px 1px 0 var(--cm-ink) !important;
          }
          :host(.wz-style-comic.in-game) .icon-button {
            background: var(--wz-ui, var(--theme-primary)) !important; color: #fff !important; border: 2px solid #3b2f2f !important;
            box-shadow: 2px 2px 0 #3b2f2f !important;
          }
          :host(.wz-style-comic) .wz-section {
            background: rgba(255, 255, 255, 0.5) !important; border: 2px solid var(--cm-ink-faint) !important; border-radius: 16px !important;
            box-shadow: none !important;
          }
          :host(.wz-style-comic.wz-card-dark) .wz-section, :host(.wz-style-comic.dark-mode:not(.wz-card-light)) .wz-section {
            background: rgba(255, 255, 255, 0.05) !important;
          }
          :host(.wz-style-comic) .wz-fold-head, :host(.wz-style-comic) .wz-section .wz-fold-head { border-radius: 12px; }
          :host(.wz-style-comic) #settings-panel .wz-section .wz-fold-head { color: var(--theme-primary) !important; font-weight: bold; }
          :host(.wz-style-comic) .settings-tabs { border-bottom: none !important; gap: 6px !important; padding-bottom: 4px; }
          :host(.wz-style-comic) .settings-tab {
            border: 2px solid var(--cm-ink) !important; border-radius: 12px !important; margin-bottom: 0;
            background: var(--wz-field, #ffffff) !important; color: var(--cm-btn-text) !important; box-shadow: none;
            transition: transform .1s ease, box-shadow .1s ease;
          }
          :host(.wz-style-comic) .settings-tab:hover { transform: translate(-1px, -1px); box-shadow: 2px 2px 0 var(--cm-ink); }
          :host(.wz-style-comic) .settings-tab.active {
            background: var(--theme-primary) !important; color: #ffffff !important; border-color: var(--cm-ink) !important;
            box-shadow: 2px 2px 0 var(--cm-ink); transform: none;
          }
          :host(.wz-style-comic) .settings-toggle { background: var(--wz-field, #ffffff) !important; border: 2px solid var(--cm-ink); box-shadow: none; }
          :host(.wz-style-comic) .settings-peer:checked ~ .settings-toggle { background: var(--theme-primary) !important; border-color: var(--cm-ink); }
          :host(.wz-style-comic) .settings-toggle::after { background: #ffffff !important; border: 2px solid var(--cm-ink); box-sizing: border-box; box-shadow: none !important; }
          :host(.wz-style-comic) .wz-range { height: 10px !important; background: var(--wz-field, #ffffff) !important; border: 2px solid var(--cm-ink); border-radius: 99px !important; box-shadow: none; }
          :host(.wz-style-comic) .wz-range::-webkit-slider-thumb, :host(.wz-style-comic) .wz-range::-webkit-slider-thumb:hover {
            width: 18px !important; height: 18px !important; border-radius: 50% !important;
            background: var(--theme-primary) !important;
            border: 2px solid var(--cm-ink) !important; box-shadow: 2px 2px 0 var(--cm-ink) !important;
          }
          :host(.wz-style-comic) .wz-part-color, :host(.wz-style-comic) #custom-theme-color-picker { border: 2px solid var(--cm-ink) !important; border-radius: 10px !important; box-shadow: 2px 2px 0 var(--cm-ink) !important; }
          :host(.wz-style-comic) .icon-button.wz-help-btn {
            border: 2px solid var(--cm-ink) !important; box-shadow: 2px 2px 0 var(--cm-ink) !important; color: #3b2f2f !important;
            background: #9fd3ff !important; border-radius: 50% !important;
            font: 800 16px "Segoe UI", Tahoma, sans-serif !important; text-shadow: none;
          }
          :host(.wz-style-comic) .icon-button.wz-help-btn:hover { background: #bfe2ff !important; }
          :host(.wz-style-mac) .icon-button.wz-help-btn {
            background: var(--wz-field, #fff) !important; border: 0.5px solid var(--wz-field-border, rgba(0, 0, 0, 0.12)) !important; border-radius: 50% !important;
            color: var(--wz-link, #0a84ff) !important; font: 600 16px -apple-system, "Segoe UI", sans-serif !important; text-shadow: none; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14) !important;
          }
          :host(.wz-style-crystal) .icon-button.wz-help-btn {
            border: 1px solid rgba(255, 255, 255, 0.85) !important; color: #1c5aa0 !important; border-radius: 50% !important;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(150, 205, 255, 0.4) 100%) !important;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 0 12px rgba(90, 170, 255, 0.55) !important;
            font: 700 16px "Segoe UI", Tahoma, sans-serif !important; text-shadow: none;
          }
          :host(.wz-style-comic) .wz-icon-tile { border-radius: 10px; border: 2px solid var(--cm-ink-faint); background: var(--wz-field, #fff); box-shadow: none; }
          :host(.wz-style-comic) .wz-icon-tile:hover { border-color: var(--cm-ink); box-shadow: 2px 2px 0 var(--cm-ink); }
          :host(.wz-style-comic) .wz-icon-tile.on { border: 2px solid var(--cm-ink); background: var(--theme-secondary); box-shadow: 2px 2px 0 var(--cm-ink); }
          :host(.wz-style-comic) .wz-icon-del { background: #ffab9e; border: 2px solid #3b2f2f; color: #3b2f2f; line-height: 12px; }
          :host(.wz-style-comic) .wz-icons { border-radius: 14px; border: 2px solid var(--cm-ink-faint); }
          /* ================= Banana Jam: Crystal look (see-through glass, on top of Bubble) ================= */
          :host(.wz-style-crystal) {
            --cr-edge: rgba(255, 255, 255, 0.85);
            --cr-glass: linear-gradient(155deg, rgba(255, 255, 255, 0.62) 0%, rgba(255, 255, 255, 0.24) 46%, rgba(255, 255, 255, 0.08) 100%);
            --cr-fill: rgba(var(--wz-card-rgb, 251, 244, 226), 0.8);
            --bub-glow: rgba(70, 205, 255, 0.45);
          }
          @supports ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
            :host(.wz-style-crystal) { --cr-fill: rgba(var(--wz-card-rgb, 251, 244, 226), 0.5); }
          }
          :host(.wz-style-crystal) #box-background, :host(.wz-style-crystal) #settings-panel, :host(.wz-style-crystal) .wz-pop-card {
            background: var(--cr-glass), var(--cr-fill) !important;
            -webkit-backdrop-filter: blur(22px) saturate(1.6); backdrop-filter: blur(22px) saturate(1.6);
            border: 1px solid var(--cr-edge) !important; border-radius: 26px !important;
            box-shadow: 0 0 0 1px rgba(0, 70, 140, 0.2), 0 0 32px var(--bub-glow), 0 18px 44px rgba(0, 40, 90, 0.35), inset 0 1px 0 #fff, inset 0 0 24px rgba(255, 255, 255, 0.3) !important;
          }
          /* the glass box blurs whatever is painted below it, so the form must sit above it */
          :host(.wz-style-crystal) #box { position: relative; z-index: 1; }
          :host(.wz-style-crystal) .wz-section, :host(.wz-style-crystal) .settings-item {
            background: var(--cr-glass) !important; border: 1px solid var(--cr-edge) !important;
            box-shadow: 0 0 0 1px rgba(70, 205, 255, 0.18), 0 3px 10px rgba(0, 50, 100, 0.1), inset 0 1px 0 #fff !important;
          }
          :host(.wz-style-crystal) .settings-tab { border-color: var(--cr-edge) !important; }
          :host(.wz-style-crystal) .settings-tab.active { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 16px var(--bub-glow) !important; }
          :host(.wz-style-crystal) #settings-panel select, :host(.wz-style-crystal) #settings-panel input[type="text"], :host(.wz-style-crystal) .wz-input {
            background: rgba(255, 255, 255, 0.5) !important; border-color: var(--cr-edge) !important; box-shadow: inset 0 2px 5px rgba(0, 60, 120, 0.12) !important;
          }
          :host(.wz-style-crystal) #settings-panel .wz-section .wz-fold-head { color: var(--wz-text) !important; }
          :host(.wz-style-crystal) .wz-pop-dim { background: rgba(10, 35, 70, 0.32); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
          :host(.wz-style-crystal) .wz-pop-head { background: linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.15) 50%, rgba(0, 0, 0, 0.04) 51%), var(--theme-primary); }
          /* ================= Banana Jam: Mac look (clean and quiet, on top of Modern) ================= */
          :host(.wz-style-mac) { --mac-line: rgba(0, 0, 0, 0.14); }
          :host(.wz-style-mac) #box-background, :host(.wz-style-mac) #settings-panel, :host(.wz-style-mac) .wz-pop-card {
            border-radius: 12px !important; border: 1px solid var(--mac-line) !important;
            box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.25), 0 22px 56px rgba(0, 0, 0, 0.3) !important;
          }
          :host(.wz-style-mac) .settings-tabs { border-radius: 8px; padding: 2px; }
          :host(.wz-style-mac) .settings-tab { border-radius: 6px !important; }
          :host(.wz-style-mac) .settings-tab.active { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25), 0 0 0 0.5px rgba(0, 0, 0, 0.08) !important; }
          :host(.wz-style-mac) .wz-section, :host(.wz-style-mac) .settings-item { border-radius: 10px !important; border: 1px solid var(--mac-line) !important; box-shadow: none !important; }
          :host(.wz-style-mac) .wz-btn { border-radius: 6px !important; }
          :host(.wz-style-mac) .wz-pop-head { background: transparent; color: var(--wz-text); text-shadow: none; border-bottom: 1px solid var(--mac-line); justify-content: center; position: relative; }
          :host(.wz-style-mac) .wz-pop-x { position: absolute; left: 10px; top: 50%; margin-top: -6px; width: 12px; height: 12px; background: #ff5f57; color: transparent; }
          /* ================= Banana Jam: Mod Menu look (pill tabs, roomy cards, round buttons, on top of Modern) ================= */
          :host(.wz-style-cards) { --cards-line: rgba(128, 128, 128, 0.4); }
          :host(.wz-style-cards) #box-background, :host(.wz-style-cards) #settings-panel, :host(.wz-style-cards) .wz-pop-card {
            border-radius: 18px !important; border: 2px solid var(--cards-line) !important; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28) !important;
          }
          :host(.wz-style-cards) .settings-tabs { border-radius: 999px; padding: 3px; }
          :host(.wz-style-cards) .settings-tab { border-radius: 999px !important; font-weight: 700; }
          :host(.wz-style-cards) .wz-section, :host(.wz-style-cards) .settings-item, :host(.wz-style-cards) .wz-subcard { border-radius: 16px !important; border: 1px solid var(--cards-line) !important; box-shadow: none !important; }
          :host(.wz-style-cards) .wz-btn { border-radius: 999px !important; font-weight: 800; box-shadow: none !important; }
          :host(.wz-style-cards) select, :host(.wz-style-cards) input[type="text"], :host(.wz-style-cards) .wz-input { border-radius: 12px !important; }
          :host(.wz-style-cards) .wz-pop-head { background: transparent; color: var(--wz-text); text-shadow: none; border-bottom: 2px solid var(--cards-line); }
          :host(.wz-style-cards) .wz-pop-x { background: #c0392b; color: #fff; }
          :host(.wz-style-cards) .wz-pop-x:hover { background: #d94636; }
          /* Older Chrome (the game window may use one) can't blend colours with color-mix().
             These plain colours are used there instead. */
          @supports not (color: color-mix(in srgb, red 50%, blue)) {
            :host { --vx-glass: rgba(255, 255, 255, 0.55); }
            .wz-subhead.wz-fold-head, .wz-fold-head { background: rgba(0, 0, 0, 0.05); }
            .wz-fold-head:hover, .wz-section .wz-fold-head:hover { background: rgba(0, 0, 0, 0.08) !important; }
            .wz-section { background: linear-gradient(180deg, rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0.25)), rgba(0, 0, 0, 0.03) !important; border: 1px solid rgba(0, 0, 0, 0.16) !important; }
            #log-in-btn { border: 1px solid rgba(0, 0, 0, 0.5) !important; }
            #log-in-btn:hover { box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 8px rgba(127, 208, 255, 0.85) !important; }
            .wz-btn-main, .wz-toggle-btn.on, .wz-part-lock { border: 1px solid rgba(0, 0, 0, 0.5) !important; }
            #settings-panel .wz-section .wz-fold-head { color: var(--theme-primary) !important; }
            .settings-peer:checked ~ .settings-toggle { border-color: rgba(0, 0, 0, 0.5); }
          }
          /* ================= end Banana Jam minimal layout ================= */
        
          /* Banana Jam: mod menu button sits in the same column; settings panel opens beside the column */
          /* once the game is showing, the login form must not stay on top of it */
          :host(.in-game) #box, :host(.in-game) #box-background, :host(.in-game) #glockoma-credit, :host(.in-game) #login-help-prompt { visibility: hidden !important; pointer-events: none !important; }
          :host(:not(.in-game)) #wz-mod-btn { display: none !important; }
          :host(.in-game) #wz-mod-btn { pointer-events: auto; width: 32px; height: 32px; min-width: 32px; padding: 0; display: inline-flex; align-items: center; justify-content: center; font-size: 17px; line-height: 1; box-sizing: border-box; }
          :host(.in-game) #wz-mod-btn.wz-off { display: none !important; }
          /* Light / dark quick button (same shared switch as Settings, the launcher and the Mod Menu) */
          #wz-mode-btn { display: inline-flex; align-items: center; justify-content: center; padding: 0; box-sizing: border-box; }
          #wz-mode-btn svg { width: 17px; height: 17px; display: block; pointer-events: none; }
          :host(.in-game) #wz-mode-btn { pointer-events: auto; width: 32px; height: 32px; min-width: 32px; }
          /* Game UI switch: off hides the little buttons over the game (peek = mouse in the bottom-left corner) */
          :host(.in-game.wz-ui-off:not(.wz-ui-peek)) .button-container-bottom-left { opacity: 0; transition: opacity .15s; }
          :host(.in-game.wz-ui-off:not(.wz-ui-peek)) .button-container-bottom-left > *, :host(.in-game.wz-ui-off:not(.wz-ui-peek)) .button-container-bottom-left .icon-button { pointer-events: none !important; }
          :host(.in-game.wz-ui-off.wz-ui-peek) .button-container-bottom-left { opacity: 1; transition: opacity .15s; }
          :host(.in-game) #settings-panel { bottom: 10px !important; left: 52px !important; }
</style>
        <div id="wz-login-bg"><div id="wz-login-bg-inner"><div id="wz-login-bg-img"></div></div></div>
        <div id="box-background"></div>
        <div id="button-tray" class="hidden">
          <ajd-button graphic="UI_fullScreen" id="expand-button">
          </ajd-button>
          <ajd-button graphic="UI_power" id="close-button">
          </ajd-button>
        </div>
        <div id="box">
<div id="login-container">
  <img src="images/banana.png" alt="App Icon" id="login-app-icon" style="width:90px;display:block;margin-bottom:8px;margin-left:auto;margin-right:auto;" loading="lazy"> <!-- Changed default src -->
  <div id="player-login-text">playerLogin</div>
  <account-management-panel id="account-panel-instance"></account-management-panel>
  <ajd-text-input id="username-input" placeholder="username" type="text"></ajd-text-input>
            <ajd-text-input id="password-input" placeholder="password" type="password"></ajd-text-input>
            <ajd-checkbox id="remember-me-cb" text="rememberMeText"></ajd-checkbox>
            <div id="login-btn-container">
              <ajd-bubble-button id="log-in-btn" text="login"></ajd-bubble-button>
              <img id="spinner" src="images/electron_login/log_spinner.svg"></img>
            </div>
            <div id="wz-links">
              <a id="forgot-password-link">forgotPassword</a>
              <span class="wz-dot">·</span>
              <a id="create-account-btn">Create account</a>
            </div>
            <div class="vertical-spacer"></div>
            <div id="need-account">needAccount?</div>
          </div>
        </div>
        <div id="glockoma-credit">
          <b>Banana Jam</b> by <b>100ugg</b> · built on <a href="https://github.com/glvckoma/Strawberry-Jam" target="_blank">Strawberry Jam by Glvckoma</a> &amp; <a href="https://github.com/Sxip/jam" target="_blank">Sxip</a>
        </div>

        <div class="button-container-bottom-left">
          <button id="wz-mod-btn" title="Mod Menu (F10)" class="icon-button">&#9776;</button>
          <button id="wz-mode-btn" title="Switch to light mode" aria-label="Switch to light mode" class="icon-button"></button>
          <button id="settings-btn" title="Settings" class="icon-button">⚙️</button>
          <div id="devtools-btn-wrapper">
            <button id="devtools-btn" title="View Debug Logs" class="icon-button"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg></button>
            <span id="devtools-error-badge">0</span>
          </div>
          <button id="wz-help-btn" title="Show the tips again" class="icon-button wz-help-btn">?</button>
        </div>

        <div id="login-help-prompt">
          <p>Having trouble logging in?</p>
          <div class="help-prompt-buttons">
            <button id="help-prompt-view-logs" class="help-prompt-btn help-prompt-btn-primary">View Logs</button>
            <button id="help-prompt-dismiss" class="help-prompt-btn help-prompt-btn-dismiss">Dismiss</button>
          </div>
        </div>
        <div id="settings-panel">
          <h3>Settings</h3>
          <div class="settings-tabs">
            <button class="settings-tab active" data-tab="general">General</button>
            <button class="settings-tab" data-tab="theme">Theme</button>
            <button class="settings-tab" data-tab="shortcuts">Shortcuts</button>
          </div>

          <div class="settings-tab-content active" id="tab-general">
            <div class="settings-subsection">
              <h5>GAME</h5>
              <div class="settings-item">
                <span>Game UI</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="game-ui-toggle" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
              <div class="wz-hint wz-item-hint">The small buttons on top of the game. Off hides them. Move your mouse to the bottom-left corner to show them again.</div>
              <div class="settings-item">
                <span>Keep running when minimised</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="background-processing-toggle" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
              <div class="wz-hint wz-item-hint">Stops the game slowing down while its window is minimised.</div>
              <div class="settings-item">
                <span>Fast mode</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="fast-mode-toggle" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
              <div class="wz-hint wz-item-hint">Uses your graphics card more so the game runs smoother. Turn it off if the game looks wrong. Restart to apply.</div>
              <div class="settings-item">
                <span>Server language</span>
                <select id="server-swap-select" class="wz-input wz-select-right">
                  <option value="">Default (US)</option>
                  <option value="en">English (US)</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="es">Spanish</option>
                  <option value="pt">Portuguese</option>
                </select>
              </div>
            </div>
            <div class="settings-subsection">
              <h5>ACCOUNT</h5>
              <div class="settings-item">
                <span>Random device ID</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="uuid-spoofer-toggle" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
              <div class="wz-hint wz-item-hint">Also called UUID spoofing. Gives each login a new random device ID.</div>
              <div id="uuid-spoofing-warning" class="hidden wz-warn">
                Doesn't work with accounts that use 2FA.
              </div>
            </div>
            <div class="settings-subsection">
              <h5>INTERFACE</h5>
              <div class="settings-item">
                <span>Dark Mode</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="dark-mode-toggle" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
              <div class="wz-hint wz-item-hint">Switches the launcher, this window and the Mod Menu together. The sun / moon button by the game does the same.</div>
              <div class="settings-item">
                <span>Show "Import Accounts"</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="show-import-accounts-toggle" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
              <div class="settings-item">
                <span>Show "Wheel Automation"</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="show-wheel-automation-toggle" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
              <div class="settings-item">
                <span>Hide the DevTools badge</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="hide-devtools-badge-toggle" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
            </div>
          </div>

          <div class="settings-tab-content" id="tab-theme">
            <div class="wz-subhead wz-top">Look</div>
            <div class="wz-outer">
              <div class="wz-minilabel">Shape</div>
              <div class="wz-row"><span class="wz-part-label wz-fixed-label">Look</span><select id="wz-look-select" class="wz-input" style="flex: 1;"></select></div>
              <div class="wz-row"><span class="wz-part-label wz-fixed-label">Window buttons</span><select id="wz-btns-select" class="wz-input" style="flex: 1;"></select></div>
              <div class="wz-hint">Look changes the shape of everything. Window buttons are the minimise, maximise and close buttons at the top.</div>
              <div class="wz-minilabel">Text</div>
              <div class="wz-row"><span class="wz-part-label wz-fixed-label">Font</span><select id="wz-font-select" class="wz-input" style="flex: 1;"></select></div>
              <div class="wz-fontprev" id="wz-font-prev">The quick brown fox jumps over the lazy dog. Aa Bb Cc 0123</div>
              <div class="wz-row">
                <button type="button" id="wz-font-up" class="wz-btn" style="flex: 1;" title="Add your own font file">Upload a font</button>
                <button type="button" id="wz-font-del" class="wz-btn" style="flex: 1;" title="Delete the chosen uploaded font">Delete this font</button>
                <input type="file" id="wz-font-file" accept=".ttf,.otf,.woff,.woff2" style="display: none;">
              </div>
              <div class="wz-row wz-font-aj">
                <span class="wz-part-label" style="flex: 1;">Also use it for Animal Jam-style text</span>
                <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                  <input type="checkbox" id="wz-font-aj" class="sr-only settings-peer">
                  <div class="settings-toggle"></div>
                </label>
              </div>
              <div class="wz-hint" id="wz-font-status"><b>Built in:</b> comes with Banana Jam. <b>On this PC:</b> installed in Windows, so it may look different on another computer. <b>My fonts:</b> fonts you upload. The Animal Jam text style stays unless you turn the switch on.</div>
            </div>
            <div class="wz-subhead wz-top">Presets</div>
            <div class="wz-outer">
              <div class="wz-row">
                <select id="wz-preset-select" class="wz-input" style="flex: 1;"><option value="">Choose a preset…</option></select>
                <button type="button" id="wz-preset-delete" class="wz-btn" title="Delete this preset">Delete</button>
              </div>
              <div class="wz-row">
                <input type="text" id="wz-preset-name" class="wz-input" placeholder="New preset name" maxlength="40" style="flex: 1;">
                <button type="button" id="wz-preset-save" class="wz-btn wz-btn-main" title="Save how it looks now as a preset">Save</button>
              </div>
              <div class="wz-row">
                <button type="button" id="wz-preset-export" class="wz-btn" style="flex: 1;" title="Download the chosen preset as a file to share">Download</button>
                <button type="button" id="wz-preset-import" class="wz-btn" style="flex: 1;" title="Upload a preset file someone shared">Upload</button>
                <input type="file" id="wz-preset-file" accept=".json,application/json" style="display: none;">
              </div>
              <div class="wz-hint" id="wz-preset-status" style="min-height: 12px;"></div>
            </div>
            <div class="wz-subhead wz-top">Colours</div>
            <div class="settings-item" id="custom-theme-color-item">
              <span>Custom theme</span>
              <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative;">
                <input type="checkbox" id="custom-theme-enabled-toggle" class="sr-only settings-peer">
                <div class="settings-toggle"></div>
              </label>
            </div>
            <div class="settings-item wz-share" id="wz-share">
              <div class="wz-share-text"><span>Same colours as the launcher</span><small id="wz-share-note"></small></div>
              <button type="button" class="wz-part-lock wz-sharelock" id="wz-share-btn" aria-pressed="false" title="Lock the launcher and the game to the same colours"><svg class="wz-lock-closed" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg><svg class="wz-lock-open" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg></button>
            </div>
            <div id="custom-theme-color-container" style="margin-top: 4px; padding: 8px; background-color: rgba(0,0,0,0.08); border-radius: 6px; opacity: 0.5; pointer-events: none;">
              <div class="wz-subhead">Theme</div>
              <div style="margin-bottom: 8px;">
                <label class="wz-flabel">Custom name</label>
                <input type="text" id="custom-theme-name-input" class="wz-input wz-full" placeholder="Banana Jam" maxlength="50">
              </div>
              <div style="margin-bottom: 8px;">
                <label class="wz-flabel">Fruit icon</label>
                <select id="custom-theme-fruit-select" class="wz-input wz-full">
                  <option value="strawberry.png">Strawberry</option>
                  <option value="banana.png">Banana</option>
                  <option value="blueberry.png">Blueberry</option>
                  <option value="cantaloupe.png">Cantaloupe</option>
                  <option value="coconut.png">Coconut</option>
                  <option value="dragonfruit.png">Dragonfruit</option>
                  <option value="pineapple.png">Pineapple</option>
                  <option value="pumpkin.png">Pumpkin</option>
                </select>
                <div class="wz-icons">
                  <div class="wz-icons-head"><span>My icons</span>
                    <button type="button" id="wz-icons-add" class="wz-btn" title="Upload a picture to use as your icon">Upload icon</button>
                    <input type="file" id="wz-icons-file" accept="image/png,image/jpeg,image/gif,image/webp" style="display: none;">
                  </div>
                  <div id="wz-icons-list" class="wz-icons-list"></div>
                  <div class="wz-hint" id="wz-icons-status"></div>
                </div>
              </div>
              <label class="wz-flabel">Main colour</label>
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                <input type="color" id="custom-theme-color-picker" class="wz-part-color" value="#e83d52">
                <input type="text" id="custom-theme-color-input" class="wz-input" style="flex: 1;" placeholder="#e83d52" maxlength="7">
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <img id="custom-theme-color-preview" src="images/banana.png" alt="Preview" style="width: 24px; height: 24px; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px;">
                  <span class="wz-hint" style="font-style: italic;">Preview</span>
                </div>
                <button type="button" id="reset-custom-theme-color-btn" class="wz-btn">Reset</button>
              </div>
            </div>
            <div id="custom-theme-color-container-2" style="margin-top: 4px; padding: 8px; background-color: rgba(0,0,0,0.08); border-radius: 6px; opacity: 0.5; pointer-events: none;">
              <div class="wz-subhead">Login</div>
              <div class="wz-group">
                <div class="wz-part-row" data-part="title">
                  <span class="wz-part-label">Title</span>
                  <input type="color" class="wz-part-color" value="#e83d52">
                  <button type="button" class="wz-part-lock" title="Locked = your own colour. Unlocked = follows the main colour.">
                    <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
                  </button>
                </div>
                <div class="wz-part-row" data-part="button">
                  <span class="wz-part-label">Buttons</span>
                  <input type="color" class="wz-part-color" value="#e83d52">
                  <button type="button" class="wz-part-lock" title="Locked = your own colour. Unlocked = follows the main colour.">
                    <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
                  </button>
                </div>
                <div class="wz-part-row" data-part="link">
                  <span class="wz-part-label">Links</span>
                  <input type="color" class="wz-part-color" value="#e83d52">
                  <button type="button" class="wz-part-lock" title="Locked = your own colour. Unlocked = follows the main colour.">
                    <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
                  </button>
                </div>
                <div class="wz-part-row" data-part="box">
                  <span class="wz-part-label">Box</span>
                  <input type="color" class="wz-part-color" value="#e83d52">
                  <button type="button" class="wz-part-lock" title="Locked = your own colour. Unlocked = follows the main colour.">
                    <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
                  </button>
                </div>
                <div class="wz-part-row" data-part="bg">
                  <span class="wz-part-label">Background</span>
                  <input type="color" class="wz-part-color" value="#e83d52">
                  <button type="button" class="wz-part-lock" title="Locked = your own colour. Unlocked = follows the main colour.">
                    <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
                  </button>
                </div>
                <div class="wz-row">
                  <span class="wz-part-label">Background picture</span>
                  <img id="wz-login-img-preview" alt="" style="width: 34px; height: 22px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(0,0,0,0.15); display: none;">
                  <button type="button" id="wz-login-img-upload" class="wz-btn">Upload</button>
                  <button type="button" id="wz-login-img-remove" class="wz-btn" style="display: none;">Remove</button>
                  <input type="file" id="wz-login-img-file" accept="image/png,image/jpeg,image/webp,image/gif" style="display: none;">
                </div>
                <div class="wz-row">
                  <span class="wz-part-label">Blur</span>
                  <input type="range" id="wz-login-blur" class="wz-range" min="0" max="40" step="1" value="0">
                  <span id="wz-login-blur-value" class="wz-range-value">Off</span>
                </div>
                <div id="wz-login-adjust" class="wz-adjust" style="display: none;">
                  <div class="wz-row">
                    <span class="wz-part-label">Zoom</span>
                    <input type="range" id="wz-login-zoom" class="wz-range" min="100" max="300" step="1" value="100">
                    <span id="wz-login-zoom-value" class="wz-range-value">100%</span>
                  </div>
                  <div class="wz-row">
                    <span class="wz-part-label">Move ↔</span>
                    <input type="range" id="wz-login-x" class="wz-range" min="0" max="100" step="1" value="50">
                    <span id="wz-login-x-value" class="wz-range-value">50%</span>
                  </div>
                  <div class="wz-row">
                    <span class="wz-part-label">Move ↕</span>
                    <input type="range" id="wz-login-y" class="wz-range" min="0" max="100" step="1" value="50">
                    <span id="wz-login-y-value" class="wz-range-value">50%</span>
                  </div>
                  <div class="wz-row">
                    <button type="button" id="wz-login-mirror" class="wz-btn wz-toggle-btn" style="flex: 1;" title="Mirror left to right">⇋ Mirror</button>
                    <button type="button" id="wz-login-flip" class="wz-btn wz-toggle-btn" style="flex: 1;" title="Flip upside down">⇅ Flip</button>
                    <button type="button" id="wz-login-reset" class="wz-btn" style="flex: 1;" title="Put zoom, position, mirror and flip back">Reset</button>
                  </div>
                </div>
                <div class="wz-hint" id="wz-login-img-status"></div>
              </div>
              <div class="wz-subhead">In-Game</div>
              <div class="wz-minilabel">Buttons and tray</div>
              <div class="wz-group">
                <div class="wz-part-row" data-part="ui">
                  <span class="wz-part-label">Colour</span>
                  <input type="color" class="wz-part-color" value="#e83d52">
                  <button type="button" class="wz-part-lock" title="Locked = your own colour. Unlocked = follows the main colour.">
                    <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
                  </button>
                </div>
              </div>
              <div class="wz-minilabel">Game border</div>
              <div class="wz-group">
                <div class="wz-part-row" data-part="border">
                  <span class="wz-part-label">Colour</span>
                  <input type="color" class="wz-part-color" value="#e83d52">
                  <button type="button" class="wz-part-lock" title="Locked = your own colour. Unlocked = follows the main colour.">
                    <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
                  </button>
                </div>
                <div class="wz-row">
                  <span class="wz-part-label">Fill the window</span>
                  <label style="display: inline-flex; align-items: center; cursor: pointer; position: relative; margin-left: auto;">
                    <input type="checkbox" id="wz-fill-toggle" class="sr-only settings-peer">
                    <div class="settings-toggle"></div>
                  </label>
                </div>
                <div class="wz-hint">No border. The game fills the whole window.</div>
                <div class="wz-row">
                  <span class="wz-part-label">Picture</span>
                  <img id="wz-border-img-preview" alt="" style="width: 34px; height: 22px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(0,0,0,0.15); display: none;">
                  <button type="button" id="wz-border-img-upload" class="wz-btn">Upload</button>
                  <button type="button" id="wz-border-img-remove" class="wz-btn" style="display: none;">Remove</button>
                  <input type="file" id="wz-border-img-file" accept="image/png,image/jpeg,image/webp,image/gif" style="display: none;">
                </div>
                <div class="wz-row">
                  <span class="wz-part-label">Blur</span>
                  <input type="range" id="wz-border-blur" class="wz-range" min="0" max="40" step="1" value="0">
                  <span id="wz-border-blur-value" class="wz-range-value">Off</span>
                </div>
                <div id="wz-border-adjust" class="wz-adjust" style="display: none;">
                  <div class="wz-row">
                    <span class="wz-part-label">Zoom</span>
                    <input type="range" id="wz-border-zoom" class="wz-range" min="100" max="300" step="1" value="100">
                    <span id="wz-border-zoom-value" class="wz-range-value">100%</span>
                  </div>
                  <div class="wz-row">
                    <span class="wz-part-label">Move ↔</span>
                    <input type="range" id="wz-border-x" class="wz-range" min="0" max="100" step="1" value="50">
                    <span id="wz-border-x-value" class="wz-range-value">50%</span>
                  </div>
                  <div class="wz-row">
                    <span class="wz-part-label">Move ↕</span>
                    <input type="range" id="wz-border-y" class="wz-range" min="0" max="100" step="1" value="50">
                    <span id="wz-border-y-value" class="wz-range-value">50%</span>
                  </div>
                  <div class="wz-row">
                    <button type="button" id="wz-border-mirror" class="wz-btn wz-toggle-btn" style="flex: 1;" title="Mirror left to right">⇋ Mirror</button>
                    <button type="button" id="wz-border-flip" class="wz-btn wz-toggle-btn" style="flex: 1;" title="Flip upside down">⇅ Flip</button>
                    <button type="button" id="wz-border-reset" class="wz-btn" style="flex: 1;" title="Put zoom, position, mirror and flip back">Reset</button>
                  </div>
                </div>
                <div class="wz-hint" id="wz-border-img-status"></div>
              </div>
              <div class="wz-hint">Bright lock: this part keeps its own colour. Dim lock: it follows the Main Colour. Picking a colour locks it.</div>
            </div>
            <div class="wz-subhead wz-top">Other</div>
            <div class="wz-outer">
              <div class="wz-minilabel">Exit menu</div>
              <div class="wz-group">
                <div class="wz-part-row" data-part="exit">
                  <span class="wz-part-label">Colour</span>
                  <input type="color" class="wz-part-color" value="#e83d52">
                  <button type="button" class="wz-part-lock" title="Locked = your own colour. Unlocked = follows the main colour.">
                    <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                    <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
                  </button>
                </div>
              </div>
              <div class="wz-minilabel">Colour picker</div>
            <div class="wz-row">
              <span class="wz-part-label" style="white-space:nowrap">See-through</span>
              <input type="range" id="wz-picker-opacity" class="wz-range" min="40" max="100" step="1" value="85">
              <span id="wz-picker-opacity-value" class="wz-range-value">85%</span>
            </div>
            <div class="wz-row wz-part-row" id="wz-picker-style-row">
              <span class="wz-part-label">Style</span>
              <select id="wz-picker-style" class="wz-input" style="width: 92px;">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
              <button type="button" class="wz-part-lock" id="wz-picker-style-lock" title="Locked = your own choice. Unlocked = follows Dark Mode.">
                <svg class="wz-lock-closed" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                <svg class="wz-lock-open" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.6-1.8"/></svg>
              </button>
            </div>
            <div class="wz-row">
              <span class="wz-part-label">Size</span>
              <select id="wz-picker-size" class="wz-input" style="width: 130px;">
                <option value="small">Small</option>
                <option value="normal">Normal</option>
                <option value="large">Large</option>
              </select>
            </div>
            <div class="wz-row">
              <span class="wz-part-label">Position</span>
              <button type="button" id="wz-picker-recenter" class="wz-btn" style="width: 130px;">Reset position</button>
            </div>
            <div class="wz-hint">Style follows Dark Mode unless you lock it. Drag the colour picker by its top bar to move it. It remembers where you leave it.</div>
            </div>
            <div class="wz-subhead wz-top">Reset</div>
            <div class="wz-outer">
              <div class="wz-row">
                <button type="button" id="wz-reset-colours" class="wz-btn" style="flex: 1;" title="Colours, name, icon and pictures go back to the Banana Jam default">Reset colours</button>
                <button type="button" id="wz-reset-all" class="wz-btn" style="flex: 1;" title="Every setting goes back to how it started">Reset all settings</button>
              </div>
              <div class="wz-hint" id="wz-reset-status">Click a reset button twice to be sure.</div>
            </div>
          </div>

          <div class="settings-tab-content" id="tab-shortcuts">
            <div class="shortcuts-note">Note: Click on the left or right side panels first to focus the window before using shortcuts</div>
            <div class="settings-subsection">
              <h5>General:</h5>
              <div class="settings-item" style="font-size: 11px; padding-left: 10px;">Ctrl + Shift + I: Toggle Developer Tools</div>
              <div class="settings-item" style="font-size: 11px; padding-left: 10px;">Ctrl + R: Reload / Logout (Return to Login Screen)</div>
              <div class="settings-item" style="font-size: 11px; padding-left: 10px;">Ctrl + Shift + H: Toggle Hide UI Elements (Settings/Report Buttons & User Tray)</div>
            </div>
            <div class="settings-subsection">
              <h5>In-Game:</h5>
              <div class="settings-item" style="font-size: 11px; padding-left: 10px;">F5: Toggle In-Game HUD</div>
              <div class="settings-item" style="font-size: 11px; padding-left: 10px;">F9: Prepare for Screenshot</div>
              <div class="settings-item" style="font-size: 11px; padding-left: 10px;">F10: Toggle Mod Menu</div>
            </div>
            <div class="settings-subsection">
              <h5>Windows/Linux:</h5>
              <div class="settings-item" style="font-size: 11px; padding-left: 10px;">Alt + Enter / F11: Toggle Fullscreen</div>
              <div class="settings-item" style="font-size: 11px; padding-left: 10px;">Ctrl + Q / Alt + F4: Quit Application</div>
            </div>
          </div>
        </div>
 
        <div id="version">
          <a id="version-link">0.0.0</a>
          <ajd-progress-ring id="version-status-icon" stroke-color="#64cc4d" stroke-width="3" radius="11"></ajd-progress-ring>
        </div>

        <!-- Import Button Section -->
        <div id="import-section">
          <import-button id="import-button-instance"></import-button>
        </div>

        <!-- Auto Wheel Section -->
        <div id="auto-wheel-section">
          <auto-wheel-button id="auto-wheel-button-instance"></auto-wheel-button>
        </div>
      
  `;
  window.LoginScreenTemplate = () => TEMPLATE;
})();
