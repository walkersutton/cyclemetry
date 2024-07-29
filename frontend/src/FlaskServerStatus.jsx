import React, { useEffect, useState } from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import axios from "axios";

export default function FlaskServerStatus() {
  const [serverReady, setServerReady] = useState(false);

  const pingFlaskServer = async () => {
    await axios
      .get(process.env.REACT_APP_FLASK_SERVER_URL + "/healthz")
      .then((response) => {
        if (response.data === "OK") {
          setServerReady(true);
        }
      })
      .catch((error) => {
        setServerReady(false);
      });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!serverReady) {
        pingFlaskServer();
      } else {
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [serverReady]);

  if (!serverReady) {
    return (
      <ProgressBar
        striped
        variant="warning"
        now={100}
        label={"connecting to server"}
      />
    );
  }
}
