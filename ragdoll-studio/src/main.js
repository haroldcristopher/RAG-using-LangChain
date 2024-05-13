const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const dotenv = require('dotenv');

const {
  app,
  BrowserWindow,
  MessageChannelMain
} = require('electron');

dotenv.config();

const TEXT_TEXT_MODEL = 'mistral';

const INSTALLER_WIDTH = 800;
const INSTALLER_HEIGHT = 460;
const INSTALLER_CLOSE_TIMEOUT = 4000;
const WINDOW_WIDTH = 1280;
const WINDOW_HEIGHT = 800;
const WINDOW_READY = 'ready-to-show';
const SERVER_READY = 'ready';
const BLACK = '#000000';
const OLLAMA_START = 'Starting Ollama... 1/4';
const OLLAMA_START_ERROR = 'Ollama is not installed. 1/4';
const OLLAMA_RUN = `Starting ${TEXT_TEXT_MODEL}... 2/4`;
const OLLAMA_INSTALL = 'Installing Ollama... 1/4';
const OLLAMA_INSTALL_COMMAND = 'curl -fsSL https://ollama.com/install.sh | sh';
const MODEL_START_COMMAND = `ollama start`;
const MODEL_RUN_COMMAND = `ollama run ${TEXT_TEXT_MODEL}`;
const MODEL_READY = `Ollama (${TEXT_TEXT_MODEL}) is running.  3/4`;
const STABLE_DIFFUSION_START = 'Starting Stable Diffusion...  3/4';
const STABLE_DIFFUSION_START_COMMAND = 'npm run start-stable-diffusion';
const STABLE_DIFFUSION_READY = 'Stable Diffusion is running. 4/4';
const STABLE_DIFFUSION_ERROR = '⚠️ Error starting Stable Diffusion API.';
const STABLE_DIFFUSION_SDAPI = 'Starting sdapi... 1/4';
const STABLE_DIFFUSION_PYTHON = 'Activating python venv... 2/4';
const STABLE_DIFFUSION_TORCH = 'Verifying torch and torchvision versions... 3/4';
const STABLE_DIFFUSION_DEPS = 'Verifying other dependencies... 4/4';
const RAGDOLL_READY = 'Starting Ragdoll Studio...';

// Start the browser instance

if (app) {
  let installer = null;
  let window = null;

  // Handle start

  app.once(SERVER_READY, () => {
    const startTime = Date.now();

    // Create installer window

    installer = new BrowserWindow({
      width: INSTALLER_WIDTH,
      height: INSTALLER_HEIGHT,
      backgroundColor: BLACK,
      frame: false,
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        devTools: false
      }
    });

    // Handle installer load

    installer.once(WINDOW_READY, async () => {
      // Send a message to the installer

      const sendMessage = (message, step) => {
        const { port1 } = new MessageChannelMain();

        installer.webContents.postMessage('message', { message, step }, [port1])
      };

      // Handle dependencies installed

      const onRagdollReady = () => {

        // Close the installer

        installer.close();

        // Create app window

        window = new BrowserWindow({
          width: WINDOW_WIDTH,
          height: WINDOW_HEIGHT,
          show: false,
          backgroundColor: BLACK,
          autoHideMenuBar: true,
          webPreferences: {
            devTools: !app.isPackaged
          }
        });

        // Handle load

        window.once(WINDOW_READY, async () => {
          console.log(RAGDOLL_READY);
          window.show();
        });

        // Load app screen

        window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
      };

      // Handle ollama installed

      const onOllamaReady = () => {
        console.log(MODEL_READY);
        sendMessage(MODEL_READY, 'Ready.');

        // Start Stable Diffusion

        StableDiffusionCLI();
      };

      // Start or install ollama

      const OllamaCLI = async () => {
        console.log(OLLAMA_START);
        sendMessage(OLLAMA_START, `Pulling ${TEXT_TEXT_MODEL}... 1/3`);

        // Run text model

        const TextModelCLI = async () => {
          console.log(OLLAMA_RUN);
          sendMessage(OLLAMA_RUN, `${MODEL_RUN_COMMAND} 2/3`);

          exec(MODEL_START_COMMAND);
          exec(MODEL_RUN_COMMAND);
        };

        // Exec commands

        try {
          await TextModelCLI();
        } catch (error) {
          console.log(OLLAMA_START_ERROR, error);
          sendMessage(OLLAMA_START_ERROR, '⚠️ Error!');
          console.log(OLLAMA_INSTALL);
          sendMessage(OLLAMA_INSTALL, `${OLLAMA_INSTALL_COMMAND} 3/3`);

          await exec(OLLAMA_INSTALL_COMMAND);

          await TextModelCLI();
        }

        setTimeout(onOllamaReady, INSTALLER_CLOSE_TIMEOUT);
      };

      // Start sdapi

      const StableDiffusionCLI = () => {
        console.log(STABLE_DIFFUSION_START);
        sendMessage(STABLE_DIFFUSION_SDAPI, STABLE_DIFFUSION_START);
        console.log(STABLE_DIFFUSION_PYTHON);
        sendMessage(STABLE_DIFFUSION_SDAPI, STABLE_DIFFUSION_PYTHON);
        console.log(STABLE_DIFFUSION_TORCH);
        sendMessage(STABLE_DIFFUSION_SDAPI, STABLE_DIFFUSION_TORCH);
        console.log(STABLE_DIFFUSION_DEPS);
        sendMessage(STABLE_DIFFUSION_SDAPI, STABLE_DIFFUSION_DEPS);

        // Exec commands

        try {
          exec(STABLE_DIFFUSION_START_COMMAND);
          console.log(STABLE_DIFFUSION_READY);
          sendMessage(STABLE_DIFFUSION_SDAPI, 'Done.');
          sendMessage(`Finished in ${((Date.now() - startTime) / 1000).toFixed(1)} seconds!`, RAGDOLL_READY);
          setTimeout(onRagdollReady, INSTALLER_CLOSE_TIMEOUT);
        } catch (error) {
          console.log(STABLE_DIFFUSION_ERROR, error);
          sendMessage(STABLE_DIFFUSION_ERROR, '⚠️ Error!');
        }
      };

      // Start Ollama

      await OllamaCLI();
    });

    // Create installer HTML and handle messages

    installer.loadURL(
      `data:text/html;charset=utf-8,<body style="color: white; font: normal normal 14px sans-serif;">
        <p style="position: fixed; left: 2rem; bottom: 10rem; font-size: 1.3em;"><strong>Ragdoll Studio v1.0</strong></p>
        <p style="position: fixed; left: 2rem; bottom: 8.6rem; opacity: .5; font-size: 1.2em;">The creative suite for character-driven AI experiences.</p>
        <p style="position: fixed; left: 2rem; bottom: 2.4rem; font-size: .9em;" id="message">${OLLAMA_START} 0/4</p>
        <p style="position: fixed; left: 2rem; bottom: 1rem; opacity: .5; font-size: .9em;" id="step"><em>Starting...</em></p>
        <script>
          const { ipcRenderer } = require('electron');
          ipcRenderer.on('message', (_, { message = '', step = '' }) => {
            document.getElementById('message').innerHTML = message;
            document.getElementById('step').firstElementChild.innerHTML = step;
          });
        </script>
      </body>`
    );
  });
}
