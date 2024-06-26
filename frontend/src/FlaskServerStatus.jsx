import React, { useEffect, useState } from "react";
import axios from "axios";

export default function FlaskServerStatus() {
  const [state, setState] = useState(false);

  const pingFlaskServer = async () => {
    await axios
      .get(process.env.REACT_APP_FLASK_SERVER_URL + "/healthz")
      .then((response) => {
        if (response.data === "OK") {
          setState(true);
        }
      })
      .catch((error) => {
        setState(false);
      });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!state) {
        pingFlaskServer();
      } else {
        clearInterval(interval);
      }
    }, 5000); // TODO: it takes about 8 pings to wake up

    // Cleanup function to clear the interval if the component unmounts
    return () => clearInterval(interval);
  }, [state]);

  if (!state) {
    return (
      <div>
        <div className={`status-bar orange`}>Systems are booting up</div>
      </div>
    );
  }
}
