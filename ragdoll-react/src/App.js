import { useEffect, useState } from 'react';

import {
  RagdollForm,
  RagdollChat,
  RagdollList,
  RagdollCast,
  Publish,
  Upload
} from './components';

import {
  useModelInfo,
  useRagdoll
} from './hooks';

import './App.css';
import Icon from './components/Icon';

// Globals

window.RAGDOLL_URI = 'http://localhost:8000';
window.STORAGE_KEY = 'RAGDOLLS';

const { STORAGE_KEY } = window;

const OVERLAY_NAMES = ['overlay', 'publish', 'upload'];
const CREATE = '+';
const DEFAULT_AVATAR_URL = '/img/avatars/arthas.png';
const DEFAULT_NAME = 'Arthas';
const DEFAULT_KNOWLEDGE_URI = 'https://wowpedia.fandom.com/wiki/Arthas_Menethil';
const DEFAULT_ART_STYLE = 'World of Warcraft concept art';
const DEFAULT_WRITING_STYLE = 'inspiring but grim, like from the dark ages';
const DEFAULT_WRITING_TONE = 'slightly annoyed';
const UPLOAD_SUCCESS = 'Document ingested.';

const DEFAULT_ADDITIONAL_KNOWLEDGE_URIS = [
  // The following is an entire novel... it seems like long-form text:
  // 1. slows the vector store way down
  // 2. doesn't add much informational value
  // 3. can smooth out the personality and fill in gaps
  // 4. worth exploring for some use cases
  // 'https://cableplugger.wordpress.com/wp-content/uploads/2010/11/world-of-warcraft-2009-arthas-rise-of-the-lich-king-christie-golden.pdf',
]

const DEFAULT_RAGDOLL = {
  name: DEFAULT_NAME,
  knowledgeURI: DEFAULT_KNOWLEDGE_URI,
  avatarURL: DEFAULT_AVATAR_URL,
  artStyle: DEFAULT_ART_STYLE,
  writingStyle: DEFAULT_WRITING_STYLE,
  writingTone: DEFAULT_WRITING_TONE,
  additionalKnowledgeURIs: DEFAULT_ADDITIONAL_KNOWLEDGE_URIS
};

const DEFAULT_RAGDOLLS = {
  [DEFAULT_KNOWLEDGE_URI]: DEFAULT_RAGDOLL
};

const MODES = {
  STORY: 'STORY',
  PICTURE: 'PICTURE',
  VIDEO: 'VIDEO',
  SOUND: 'SOUND',
  CODE: 'CODE'
};

let SAVED_RAGDOLLS = JSON.parse(
  localStorage.getItem(STORAGE_KEY)
);

if (!SAVED_RAGDOLLS) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_RAGDOLLS));
}

SAVED_RAGDOLLS = JSON.parse(
  localStorage.getItem(STORAGE_KEY)
);

const App = () => {
  const { RAGDOLL_URI } = window;

  const [question, setQuestion] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [text, setText] = useState('');
  const [imageURL, setImageURL] = useState('');
  const [imageURL2, setImageURL2] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [overlayClassName, setOverlayClassName] = useState('');
  const [timeoutId, setTimeoutId] = useState();

  const [ragdollName, setRagdollName] = useState('');
  const [ragdollKnowledgeURI, setRagdollKnowledgeURI] = useState('');
  const [ragdollArtStyle, setRagdollArtStyle] = useState('');
  const [ragdollWritingStyle, setRagdollWritingStyle] = useState('');
  const [ragdollWritingTone, setRagdollWritingTone] = useState('');
  const [ragdollAvatarURL, setRagdollAvatarURL] = useState('');
  const [ragdollAdditionalKnowledgeURIs, setRagdollAdditionalKnowledgeURIs] = useState([]);
  const [ragdollList, setRagdollList] = useState(SAVED_RAGDOLLS);
  const [ragdoll, setRagdoll] = useState(!SAVED_RAGDOLLS ? DEFAULT_RAGDOLL : null);

  const [modelInfo] = useModelInfo(ragdoll);
  const [renderImages, setRenderImages] = useState(!!ragdoll?.artStyle);
  const [activeRagdoll] = useRagdoll(ragdoll, renderImages);
  const [mode, setMode] = useState(MODES.STORY);

  useEffect(() => {
    const ragdolls = getRagdollsArray();
    const currentRagdoll = ragdolls[0] || ragdoll;

    const savedRagdolls = {
      ...ragdollList,

      [currentRagdoll.knowledgeURI]: {
        ...currentRagdoll,

        online: true
      }
    };

    setTimeout(() => {
      setRagdoll(currentRagdoll);
      setRagdollList(savedRagdolls);
      setRenderImages(!!currentRagdoll.artStyle);
    }, 200);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.onkeydown = isCreating || isPublishing || isUploading
      ? (overlayClassName && onKeyDownOverlay)
      : null;

    return () => document.body.onkeydown = null;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isCreating,
    isPublishing,
    isUploading,
    overlayClassName
  ]);

  useEffect(() => {
    return () => clearTimeout(timeoutId);
  }, [timeoutId]);

  useEffect(() => {
    const isPictureMode = mode === MODES.PICTURE;

    if (isPictureMode) {
      setQuestion('');
    } else {
      setImageInput('');
    }
  }, [mode]);

  const openOverlay = () => {
    setIsCreating(true);
    setOverlayClassName('');

    requestAnimationFrame(() => {
      setOverlayClassName('show');
    });
  };

  const openPublishOverlay = () => {
    setIsPublishing(true);

    setOverlayClassName('');

    requestAnimationFrame(() => {
      setOverlayClassName('show');
    });
  };

  const openUploadOverlay = () => {
    setIsUploading(true);

    setOverlayClassName('');

    requestAnimationFrame(() => {
      setOverlayClassName('show');
    });
  };

  const closeOverlay = () => {
    setRagdollName('');
    setRagdollKnowledgeURI('');
    setRagdollArtStyle('');
    setRagdollWritingStyle('');
    setRagdollWritingTone('');
    setOverlayClassName('');

    setTimeoutId(
      setTimeout(() => {
        setIsCreating(false);
        setIsPublishing(false);
        setIsUploading(false);
      }, 1000)
    );
  };

  const getRagdollsArray = () => (
    Object.values(ragdollList || {})
  );

  const uploadFile = async file => {
    const response = await fetch(`${RAGDOLL_URI}/v1/upload`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: ragdoll.knowledgeURI,
        knowledge: file
      })
    });

    if (response?.ok) {
      const result = await response?.json();

      if (result?.additionalKnowledgeURIs) {
        setRagdoll({
          ...ragdoll,

          additionalKnowledgeURIs: result.additionalKnowledgeURIs
        });

        alert(UPLOAD_SUCCESS);
        closeOverlay();
      }
    }
  };

  const loadImage = src => {
    const image = new Image();

    image.onload = () => didLoadImage(image);
    image.src = src;
  };

  const onKeyDownOverlay = ({ keyCode }) => {
    if (keyCode === 27) {
      closeOverlay();
    }
  };

  const onClickOverlay = ({ target: { id }}) => {
    if (OVERLAY_NAMES.includes(id)) {
      closeOverlay();
    }
  };

  const onClickShowImages = () => (
    setRenderImages(!renderImages)
  );

  const onClickStoryMode = () => {
    setQuestion('');
    setText('');
    setImageURL('');
    setImageURL2('');
    setMode(MODES.STORY)
  };

  const onClickPictureMode = () => {
    setQuestion('');
    setText('');
    setImageURL('');
    setImageURL2('');
    setMode(MODES.PICTURE)
  };

  const onChangeRagdollName = ({ target: { value }}) => (
    setRagdollName(value)
  );

  const onChangeRagdollKnowledgeURI = ({ target: { value }}) => (
    setRagdollKnowledgeURI(value)
  );

  const onChangeRagdollArtStyle = ({ target: { value }}) => (
    setRagdollArtStyle(value)
  );

  const onChangeRagdollWritingStyle = ({ target: { value }}) => (
    setRagdollWritingStyle(value)
  );

  const onChangeRagdollWritingTone = ({ target: { value }}) => (
    setRagdollWritingTone(value)
  );

  const onChangeRagdollAvatarURL = ({ target: { value }}) => (
    setRagdollAvatarURL(value)
  );

  const onChangeRagdollAdditionalKnowledgeURIs = ({ target: { value }}) => (
    setRagdollAdditionalKnowledgeURIs([
      ...ragdollAdditionalKnowledgeURIs,

      value
    ])
  );

  const onQuestion = value => setQuestion(value);

  const onAnswer = answer => {
    setImageURL(answer?.imageURL);
    setText(answer?.text);

    if (answer?.imageURL2) {
      setImageURL2(answer.imageURL2);
    }
  };

  const onClickListItem = () => {
    setDisabled(true);
  };

  const didLoadImage = src => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.height = src.naturalHeight;
    canvas.width = src.naturalWidth;

    ctx.drawImage(src, 0, 0);

    const dataURL = canvas.toDataURL();

    if (dataURL) {
      setImageInput(dataURL);
    }

    closeOverlay();
  };

  const didClickListItem = ({ currentRagdoll, previousRagdoll }) => {
    setRagdoll(currentRagdoll);

    const updatedRagdollList = {
      ...ragdollList,

      [currentRagdoll.knowledgeURI]: currentRagdoll
    };

    if (previousRagdoll?.knowledgeURI) {
      previousRagdoll.online = false;
      updatedRagdollList[previousRagdoll.knowledgeURI] = previousRagdoll;
    }

    setRenderImages(!!currentRagdoll.artStyle);
    setRagdollList(updatedRagdollList);
    setText('');
    setImageURL('');
    setImageURL2('');
    setQuestion('');
    setDisabled(false);
  };

  const ragdollFormProps = {
    disabled,
    ragdoll: activeRagdoll || ragdoll,
    ragdollList,
    ragdollName,
    ragdollKnowledgeURI,
    ragdollArtStyle,
    ragdollWritingStyle,
    ragdollWritingTone,
    ragdollAvatarURL,
    ragdollAdditionalKnowledgeURIs,
    onChangeRagdollName,
    onChangeRagdollKnowledgeURI,
    onChangeRagdollArtStyle,
    onChangeRagdollWritingStyle,
    onChangeRagdollWritingTone,
    onChangeRagdollAvatarURL,
    onChangeRagdollAdditionalKnowledgeURIs
  };

  const ragdollChatProps = {
    disabled: disabled || isCreating,
    ragdoll: activeRagdoll || ragdoll,
    question,
    imageInput,
    imageURL,
    imageURL2,
    text,
    renderImages,
    mode,
    onQuestion,
    onAnswer,
    onClickShowImages,
    openUploadOverlay
  };

  const ragdollListProps = {
    ragdoll: activeRagdoll || ragdoll,
    ragdollList,
    onClickListItem,
    didClickListItem
  };

  const ragdollCastProps = {
    disabled: disabled || isCreating,
    ragdollList,
    onShow: openPublishOverlay
  };

  const isPictureMode = mode === MODES.PICTURE;

  return <main id="app">
    {isCreating && (
      <aside
        id="overlay"
        className={overlayClassName}
        onClick={onClickOverlay}
      >
        <RagdollForm { ...ragdollFormProps } />
      </aside>
    )}
    {isPublishing && (
      <aside
        id="publish"
        className={overlayClassName}
        onClick={onClickOverlay}
      >
        <Publish onClickClose={closeOverlay} />
      </aside>
    )}
    {isUploading && (
      <aside
        id="upload"
        className={overlayClassName}
        onClick={onClickOverlay}
      >
        <Upload
          disabled={disabled}
          type={isPictureMode
            ? 'image/*'
            : 'application/json'
          }
          onFile={isPictureMode
            ? loadImage
            : uploadFile
          }
        />
      </aside>
    )}
    <header>
      <h4 id="llm-status">
        {!isPictureMode && <span>
          <span className={`indicator ${modelInfo?.textTextModel ? 'online' : ''}`} />
          <span className="indicator-label">Text-to-Text:</span>&nbsp;<em>{modelInfo?.textTextModel || 'Loading...'}</em>
        </span>}
        {!isPictureMode && <span>
          <span className="indicator idle" />
          <span className="indicator-label">Text-to-speech:</span>&nbsp;<em>-</em>
        </span>}
        {!isPictureMode && <span>
          <span className={`indicator ${modelInfo?.textTextModel ? renderImages ? 'online' : 'idle' : ''}`} />
          <span className="indicator-label">Text-to-Image:</span>&nbsp;<em>{modelInfo?.textImageModel || 'Loading...'}</em>
        </span>}
        {isPictureMode && <span>
          <span className={`indicator ${(isPictureMode && modelInfo?.imageImageModel) ? 'online' : 'idle'}`} />
          <span className="indicator-label">Image-to-Image:</span>&nbsp;<em>{(!isPictureMode ? '-' : (modelInfo?.imageImageModel || 'Loading...'))}</em>
        </span>}
      </h4>
      <nav id="switch">
        <button onClick={onClickStoryMode} className={!isPictureMode ? 'active' : ''}>
          <Icon src="/img/story.svg" />
          {!isPictureMode && <span className="indicator" />}
        </button>
        <button onClick={onClickPictureMode} className={isPictureMode ? 'active' : ''}>
          <Icon src="/img/picture.svg" />
          {isPictureMode && <span className="indicator" />}
        </button>
        <button className="disabled">
          <Icon src="/img/video.svg" />
        </button>
        <button className="disabled">
          <Icon src="/img/audio.svg" />
        </button>
        <button className="disabled">
          <Icon src="/img/code.svg" />
        </button>
      </nav>
    </header>
    <div id="app-frame">
      <RagdollList { ...ragdollListProps }>
        <button
          disabled={isCreating}
          id="create-ragdoll-button"
          onClick={openOverlay}
        >
          {CREATE}
        </button>
        <RagdollCast {...ragdollCastProps} />
      </RagdollList>
      <div id="workspace" className="panel">
        <RagdollChat {...ragdollChatProps } />
      </div>
    </div>
  </main>;
}

export default App;
