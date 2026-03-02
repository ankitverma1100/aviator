import React, { useCallback, useEffect, useState } from "react";
import { PiListBold } from "react-icons/pi";
import { GiServerRack } from "react-icons/gi";

import {
  HiOutlineSpeakerWave,
  HiOutlineMusicalNote,
  HiOutlineShieldCheck,
  HiOutlineDocumentText,
  HiOutlineComputerDesktop,
  HiOutlineQuestionMarkCircle,
  HiOutlineStar,
  HiOutlineClock,
} from "react-icons/hi2";
import { CiMoneyBill } from "react-icons/ci";
import { ImCopy } from "react-icons/im";
import { RxAvatar } from "react-icons/rx";

import Context from "../../context";
import { appConfig } from "../../shared/config/appConfig";
import ChatImg from "../../assets/images/chat.svg";
import { displayName, generateRandomString } from "../utils";
import axios from "axios";
import copy from "copy-to-clipboard";

const Menu = ({ setHowto, showChat = false }) => {
  const context = React.useContext(Context);
  const {
    minBet,
    maxBet,
    handleChangeUserSeed,
    updateUserInfo,
    toggleMsgTab,
    msgReceived,
    setMsgReceived,
  } = context;
  const userInfo = React.useMemo(
    () => context?.userInfo ?? context?.state?.userInfo ?? {},
    [context?.userInfo, context?.state?.userInfo]
  );
  const [showDropDown, setShowDropDown] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<string>("");
  const [clientSeedType, setClientSeedType] = useState<number>(0);
  const [mouseCursorStatus, setMouseCursorStatus] = useState<boolean>(false);
  const [changeSeed, setChangeSeed] = useState<boolean>(false);
  const [changeAvatar, setChangeAvatar] = useState<boolean>(false);
  const [animationEnabled, setAnimationEnabled] = useState<boolean>(true);

  const [key,] = useState<string>(generateRandomString(20));
  const [customKey, setCustomKey] = useState<string>(generateRandomString(20));
  const [imgNums, setImgNums] = useState<number[]>([]);

  useEffect(() => {
    if (clientSeedType === 0) {
      handleChangeUserSeed(key);
    }
    if (clientSeedType === 1) {
      handleChangeUserSeed(customKey);
    }
  }, [clientSeedType, customKey, handleChangeUserSeed, key])

  /**
   * Toggle the drop down menu
   */
  const toggleDropDown = () => {
    setShowDropDown(!showDropDown);
  };

  /**
   * Hide the drop down menu if click occurs
   * outside of the drop-down element.
   *
   * @param event  The mouse event
   */
  const dismissHandler = (event: React.FocusEvent<HTMLButtonElement>): void => {
    if (event.currentTarget === event.target && mouseCursorStatus === false) {
      setShowDropDown(false);
    }
  };

  const Icons = ({ type }: { type: string }) => {
    if (type === "fair") return <HiOutlineShieldCheck color="#83878e" size={20} />;
    if (type === "rules") return <HiOutlineDocumentText color="#83878e" size={20} />;
    if (type === "limits") return <CiMoneyBill color="#83878e" size={20} />;
    if (type === "free-bets") return <HiOutlineStar color="#83878e" size={20} />;
    if (type === "history") return <HiOutlineClock color="#83878e" size={20} />;
    if (type === "howto") return <HiOutlineQuestionMarkCircle color="#83878e" size={20} />;
    return <HiOutlineDocumentText color="#83878e" size={20} />;
  };

  const handleToggleSound = useCallback(
    async (checked) => {
      let takeOffAudioEle: any = document.getElementById("takeOffAudio");
      let flewAwayAudioEle: any = document.getElementById("flewAwayAudio");
      if (checked === false) {
        takeOffAudioEle.pause();
        flewAwayAudioEle.pause();
      }
      try {
        await axios.post(
          `${appConfig.platform.apiBase}/update-info`,
          {
            userId: userInfo.userId,
            updateData: { isSoundEnable: checked },
          }
        );
        updateUserInfo({
          ...userInfo,
          isSoundEnable: checked,
        },
        );
      } catch (error) {
        console.log("Failed to update Sound state");
      }
    },
    // eslint-disable-next-line
    [userInfo]
  );

  const handleToggleMusic = useCallback(
    async (checked) => {
      try {
        await axios.post(
          `${appConfig.platform.apiBase}/update-info`,
          {
            userId: userInfo.userId,
            updateData: { isMusicEnable: checked },
          }
        );
        updateUserInfo({
          ...userInfo,
          isMusicEnable: checked,
        },
        );
      } catch (error) {
        console.log("Failed to update music state");
      }
    },
    // eslint-disable-next-line
    [userInfo]
  );

  const handleToggleAnimation = useCallback(
    async (checked) => {
      setAnimationEnabled(checked);
      try {
        await axios.post(`${appConfig.platform.apiBase}/update-info`, {
          userId: userInfo.userId,
          updateData: { isAnimationEnable: checked },
        });
      } catch (error) {
        console.log("Failed to update animation state");
      }
    },
    [userInfo]
  );

  const handleOpenSettings = (type: string) => {
    if (type === "rules") {
      setHowto("more");
      setShowDropDown(false);
      return;
    }
    if (type === "howto") {
      setHowto("short");
      setShowDropDown(false);
      return;
    }
    if (type === "free-bets" || type === "history") {
      setShowDropDown(false);
      return;
    }
    if (type === "fair") {
      setModalType(type);
      setShowModal(true);
      setShowDropDown(false);
      return;
    }
    setModalType(type);
    setShowModal(true);
    setShowDropDown(false);
  };

  const handleImgClick = async (avatar: string) => {
    const response: any = await axios.post(
      `${appConfig.platform.apiBase}/update-info`,
      {
        userId: userInfo.userId,
        updateData: { avatar },
      }
    );

    if (response.data?.status) {
      updateUserInfo({
        ...userInfo,
        avatar,
      },
      );
    }
  };

  const toggleChangeAvatar = () => {
    setChangeAvatar(!changeAvatar);
  };

  useEffect(() => {
    window?.addEventListener("click", () => {
      let num: number[] = [];
      for (let i = 1; i < 73; i++) {
        num.push(i);
      }
      setImgNums(num);

      try {
        if (
          localStorage.getItem("aviator-audio") !== "true" &&
          userInfo.isMusicEnable === true
        ) {
          let mainEle: any = document.getElementById("mainAudio");
          mainEle.volume = 0.2;
          mainEle.play();
          localStorage.setItem("aviator-audio", "true");
        }
      } catch (error) {
        // handleToggleSound(true);
        // handleToggleMusic(true);
      }
    });
    // eslint-disable-next-line
  }, []);

  return (
    <div
      tabIndex={0}
      onBlur={() => {
        if (mouseCursorStatus === false) setShowDropDown(false);
      }}
      className="flex"
    >
      <button
        className={`setting-button ${showDropDown ? "active" : ""}`}
        aria-label="Setting menu"
        onClick={(): void => toggleDropDown()}
        onBlur={(e: React.FocusEvent<HTMLButtonElement>): void =>
          dismissHandler(e)
        }
      >
        <PiListBold color="#83878e" size={20} />
      </button>
      {showChat && (
        <button
          className={`setting-button ${showDropDown ? "active" : ""}`}
          onClick={() => {
            toggleMsgTab();
            setMsgReceived(!msgReceived);
          }}
        >
          <img src={ChatImg} alt="chat section" />
        </button>
      )}
      <div
        className="aviator-dropdown-menu"
        onMouseLeave={() => setMouseCursorStatus(false)}
        onMouseEnter={() => setMouseCursorStatus(true)}
      >
        {showDropDown && (
          <div>
            <div
              className={
                showDropDown ? "setting-dropdown" : "setting-dropdown active"
              }
            >
              <div className="first-block">
                <div className="user-info">
                  <div className="avatar">
                    <img
                      className="avatar"
                      src={`${userInfo?.avatar
                        ? userInfo?.avatar
                        : "./avatars/av-5.png"
                        }`}
                      alt="avatar"
                    />
                  </div>
                  <div className="name">
                    {displayName(userInfo?.userName)}
                  </div>
                </div>
                <div
                  className="avatar-change"
                  onClick={() => {
                    toggleChangeAvatar();
                    setShowDropDown(false);
                  }}
                >
                  <div className="avatar-logo">
                    <RxAvatar color="#83878e" size={20} />
                  </div>
                  <div className="change-text">
                    <div>Change</div>
                    <div>Avatar</div>
                  </div>
                </div>
              </div>
              <div className="setting-second-block">
                <div className="setting-dropdown-item">
                  <div className="icon-section">
                    <HiOutlineSpeakerWave color="#83878e" size={20} />
                    <span className="setting-title-text">Sound</span>
                  </div>
                  <div className="aviator-main-audio">
                    <label className="aviator-switch">
                      <input
                        className="aviator-input"
                        type="checkbox"
                        checked={userInfo.isSoundEnable || false}
                        onChange={(e) => handleToggleSound(e.target.checked)}
                      />
                      <span className="aviator-slider round"></span>
                    </label>
                  </div>
                </div>
                <div className="setting-dropdown-item">
                  <div className="icon-section">
                    <HiOutlineMusicalNote color="#83878e" size={20} />
                    <span className="setting-title-text">Music</span>
                  </div>
                  <div className="aviator-main-audio">
                    <label className="aviator-switch">
                      <input
                        className="aviator-input"
                        type="checkbox"
                        checked={userInfo.isMusicEnable || false}
                        onChange={(e) => handleToggleMusic(e.target.checked)}
                      />
                      <span className="aviator-slider round"></span>
                    </label>
                  </div>
                </div>
                <div className="setting-dropdown-item">
                  <div className="icon-section">
                    <HiOutlineComputerDesktop color="#83878e" size={20} />
                    <span className="setting-title-text">Animation</span>
                  </div>
                  <div className="aviator-main-audio">
                    <label className="aviator-switch">
                      <input
                        className="aviator-input"
                        type="checkbox"
                        checked={animationEnabled}
                        onChange={(e) => handleToggleAnimation(e.target.checked)}
                      />
                      <span className="aviator-slider round"></span>
                    </label>
                  </div>
                </div>

                <div className="menu-divider"></div>

                {[
                  { label: "Free Bets", handleType: "free-bets" },
                  { label: "My Bet History", handleType: "history" },
                  { label: "Game Limits", handleType: "limits" },
                  { label: "How To Play", handleType: "howto" },
                  { label: "Game Rules", handleType: "rules" },
                  { label: "Provably Fair Settings", handleType: "fair" },
                ].map((item, index) => (
                  <div
                    key={`${item.handleType}-${index}`}
                    className="setting-dropdown-item info-item"
                    onClick={() => handleOpenSettings(item.handleType)}
                  >
                    <div className="icon-section">
                      <Icons type={item.handleType} />
                      <span className="setting-title-text">{item.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {showModal && modalType === "fair" && (
        <div className="modal active">
          <div onClick={() => setShowModal(false)} className="back"></div>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <span className="modal-title">Provably Fair Settings</span>
                <button className="close" onClick={() => setShowModal(false)}>
                  <span>x</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="main-desc">
                  This game uses Provably Fair technology to determine game
                  result. This tool gives you ability to change your seed and
                  check fairness of the game.
                </div>
                <div className="client-seed">
                  <div className="client-seed-title">
                    <HiOutlineComputerDesktop color="#83878e" size={30} />
                    <span className="setting-title-text">
                      Client (your) seed:
                    </span>
                  </div>
                  <div>
                    Round result is determined form combination of server seed
                    and first 3 bets of the round.
                  </div>
                  <div
                    className={`client-seed-custom ${clientSeedType === 1 && "block-key"
                      }`}
                  >
                    <div
                      className="label"
                      onClick={() => {
                        setClientSeedType(0);
                      }}
                    >
                      <label>
                        <span className="radio">
                          {clientSeedType === 0 ? (
                            <span className="dot"></span>
                          ) : (
                            <></>
                          )}
                        </span>
                        <span>Random on every new game</span>
                      </label>
                    </div>
                    <div className="key-container">
                      <div className="key">
                        <span className="current"> Current: </span>
                        <span className="main-key">{key}</span>
                      </div>
                      <span className="copy-icon">
                        <ImCopy
                          color="#868b8d"
                          size={16}
                          onClick={() => copy(key)}
                        />
                      </span>
                    </div>
                  </div>
                  <div
                    className={`client-seed-custom ${clientSeedType === 0 && "block-key"
                      }`}
                  >
                    <div
                      className="label"
                      onClick={() => {
                        setClientSeedType(1);
                      }}
                    >
                      <label>
                        <span className="radio">
                          {clientSeedType === 1 ? (
                            <span className="dot"></span>
                          ) : (
                            <></>
                          )}
                        </span>
                        <span>Enter manually</span>
                      </label>
                    </div>
                    <div className="key-container">
                      <div className="key">
                        <span className="current"> Current: </span>
                        <span className="main-key">{customKey}</span>
                      </div>
                      <span className="copy-icon">
                        <ImCopy
                          color="#868b8d"
                          size={16}
                          onClick={() => copy(customKey)}
                        />
                      </span>
                    </div>
                    <div className="key-change">
                      <button
                        className="btn btn-success"
                        onClick={() => {
                          setChangeSeed(true);
                        }}
                        disabled={clientSeedType === 0}
                      >
                        CHANGE
                      </button>
                    </div>
                  </div>
                </div>
                <div className="server-seed">
                  <div className="server-seed-title">
                    <GiServerRack color="#83878e" size={30} />
                    <span className="setting-title-text">
                      Server seed SHA256:
                    </span>
                  </div>
                  <div className="server-seed-value-block">
                    <div className="key-container">
                      {/* <div className="key">{state.seed}</div> */}
                      <div className="key">10</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                You can check fairness of each bet from bets history
              </div>
            </div>
          </div>

          {changeSeed === true && (
            <div className="seed-wrapper">
              <div className="seed-change">
                <div className="seed-header">
                  <div>CHANGE SEED</div>
                  <button
                    type="button"
                    data-dismiss="modal"
                    aria-label="Close"
                    className="close"
                    onClick={() => setChangeSeed(false)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
                <div className="seed-body">
                  <div className="seed-body-title">Enter new seed:</div>
                  <div className="seed-value">
                    <input
                      type="text"
                      title="Seed"
                      className="ng-untouched ng-pristine ng-valid"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-warning btn-random"
                      onClick={() => setCustomKey(generateRandomString(20))}
                    >
                      <span className="text-uppercase">Random</span>
                    </button>
                  </div>
                  <div className="actions">
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={() => setChangeSeed(false)}
                    >
                      <span className="text-uppercase">Save</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={() => setChangeSeed(false)}
                    >
                      <span className="text-uppercase">Cancel</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && modalType === "limits" && (
        <div className="modal active">
          <div onClick={() => setShowModal(false)} className="back"></div>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <span className="modal-title">Game Limits</span>
                <button className="close" onClick={() => setShowModal(false)}>
                  <span>x</span>
                </button>
              </div>
              <div className="modal-body special-modal-body">
                <ul className="list-group">
                  <li className="list-group-item pl-2 pr-1">
                    <div>
                      <span>Minimum bet</span>
                      <span>(INR):</span>
                    </div>
                    <span className="badge badge-success px-2 font-weight-normal">
                      {minBet}
                    </span>
                  </li>
                  <li className="list-group-item pl-2 pr-1">
                    <div>
                      <span>Maximum bet</span>
                      <span>(INR):</span>
                    </div>
                    <span className="badge badge-success px-2 font-weight-normal">
                      {maxBet}
                    </span>
                  </li>
                  <li className="list-group-item pl-2 pr-1">
                    <div>
                      <span>Maximum win for one bet</span>
                      <span>(INR):</span>
                    </div>
                    <span className="badge badge-success px-2 font-weight-normal">
                      8000000
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {changeAvatar && (
        <div className="modal active">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <span>CHOOSE GAME AVATAR</span>
                <button
                  type="button"
                  className="close"
                  onClick={() => setChangeAvatar(false)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="content">
                  {imgNums.map((item) => {
                    let imgURL = `/avatars/av-${item}.png`;
                    let flag = imgURL === userInfo?.avatar;
                    return (
                      <span key={item} className="img-item">
                        <button
                          type="button"
                          className="img-btn"
                          onClick={() => handleImgClick(imgURL)}
                        >
                          <img
                            className={`game-img mr-2 mb-2 ng-star-inserted ${flag ? "active" : ""
                              }`}
                            src={imgURL}
                            alt={imgURL}
                          />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setChangeAvatar(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
