import WallpaperIcon from '@material-ui/icons/Wallpaper';
import { useEffect, useState } from 'react';

import Debug from 'debug';
import { fetchAndMakeURL } from '../network/ipfsWebClient';
import readMetadata from '../utils/notebookMetadata';
import { getIPFSState } from '../network/ipfsState';

import { parse } from 'json5';

const debug = Debug('notebooks');

const DEFAULT_HIVE_PATH = "/ipns/k51qzi5uqu5dk56owjc245w1z3i5kgzn1rq6ly6n152iw00px6zx2vv4uzkkh9";

// get list of notebooks from IPNS path
// this should be refactored once we cleaned the IFPS state code
// no need to do raw ipfs operations or data mangling here
export const getNotebooks = (ipfs) => {
  const ipfsState = ipfs;

  debug("ipfsState",ipfsState)
  if (!ipfsState) return null
  
  const notebookCategories = Object.keys(ipfsState);

  const allNotebooks = notebookCategories.map(category => {
    const notebooks = Object.entries(ipfsState[category]);
    debug('getNotebooks', category, notebooks);
  
    return notebooks.map(([name, notebookFolder]) => {
      const cid = notebookFolder[".cid"];
      debug("got cid for",name,notebookFolder,":", cid);
      const notebookJSON = notebookFolder["input"]["notebook.ipynb"];
      debug("getting metadata for", notebookJSON);
      const { description } = readMetadata(notebookJSON)
      debug("notebookMetadata", name, description);
      return {
        category, 
        name, 
        path:`/p/${cid}/create`, 
        description,
        Icon: WallpaperIcon
      };
    });
  }).flat();
  
  debug('getNotebooks parsed', allNotebooks);
  
  return allNotebooks;
}

