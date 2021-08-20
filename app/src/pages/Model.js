import React, { useEffect, useMemo, useState } from "react";
import { Button, Container, Link, Paper, Typography } from "@material-ui/core";
import Alert from '@material-ui/lab/Alert';
import Markdown from 'markdown-to-jsx';
import GitHubIcon from '@material-ui/icons/GitHub';


import useColab from "../network/useColab"
import readMetadata from "../utils/notebookMetadata";
import HelpModal from "../components/HelpModal";
import Debug from "debug";


// Components
import { IpfsLog } from "../components/Logs";
import FormView from '../components/Form'
import ImageViewer, { getCoverImage } from '../components/MediaViewer'
import NodeStatus from "../components/NodeStatus";
import { SEO, SEOMetadata } from "../components/Helmet";
import { NotebookProgress } from "../components/NotebookProgress";
import { SocialPostStatus } from "../components/Social";
import NotebookSelector from "../components/NotebookSelector";

const debug = Debug("Model");

// for backward compatibility we check if the notebook.ipynb is at / or at /input
// the new "correct" way is to save the notebook.ipynb to /input

const getNotebookMetadata = ipfs => readMetadata((ipfs?.input && ipfs.input["notebook.ipynb"]) || ipfs && ipfs["notebook.ipynb"]);

export default React.memo(function Model() {

  const { state, dispatch: dispatchInputState, setStatus } = useColab(); // {state:{ipfs:{},contentID: null, nodeID:null}, dispatch: noop}

  const { ipfs, nodeID, status, contentID } = state;

  const metadata = getNotebookMetadata(ipfs);

  //debug("images", images)
  useEffect(() => {
    debug("First model render. We have a problem if you see this twice.")
  }, []);


  const dispatchForm = async inputs => dispatchInputState({
    ...inputs,
    ["notebook.ipynb"]: ipfs?.input["notebook.ipynb"] , 
    formAction: "submit"
  });

  const cancelForm = () => dispatchInputState({...state.inputs, formAction: "cancel" })

  return <>
       {/* Nav Bar */}
       <NotebookSelector {...state} />   
       <Alert severity="warning">
          Google recently significantly reduced the memory available to free Cloud GPUs. Pollinations depends on these to do the computations. 
        <br/> <br/>
        Image generation may fail intermittently. We are working on a fix. Discussion on <Link href="https://github.com/pollinations/pollinations/issues/62">Github</Link>.
        <br /><br/>
        The <Link href="/p/QmTBUAGsqWzJsF1Ccuzk9W5STkzGa8bK6QcPpj7JrT4a6J">CLIP-Guided Diffusion model</Link> seems to be working and we made it the default for the time being.
       </Alert>
       <Container maxWidth="md">
      <div style={{display:'flex', flexWrap: 'wrap'}}>
      <SEO metadata={metadata} output={ipfs.output} />
      {/* control panel */}

        {/* just in case */}
        {metadata && metadata.description ?<div style={{ width: '100%'}}><Markdown>{metadata.description}</Markdown></div> : null}

        {/* inputs */}
        <div style={{ width: '100%'}}>
          <h3>Inputs</h3>

          <FormView
            input={ipfs.input}
            status={status}
            colabState={ipfs?.output?.status}
            metadata={metadata}
            nodeID={nodeID}
            onSubmit={dispatchForm} 
            onCancel={cancelForm}
            />
          <NotebookProgress 
            output={ipfs.output}  
            metadata={metadata}
           />
        </div>
        { 
        ipfs?.output?.social && 
          (<div style={{ width: '100%'}}>
            <h3>Social</h3>
            <br />
            <SocialPostStatus results={ipfs?.output?.social} />
          </div>)
        }

      {/* previews */}
      { ipfs.output && <div >
                          <ImageViewer output={ipfs.output} contentID={contentID}/>
                        </div>
      }

      <div style={{ width: '100%'}}>
          <IpfsLog state={state}/>
      </div>


    </div>
    <Typography align="right" > Get help and contribute on<Button href="https://github.com/pollinations/pollinations"> Github&nbsp;<GitHubIcon /></Button></Typography>
    </Container>
  </>
});
