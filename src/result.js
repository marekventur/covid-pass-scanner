import { useMemo, useState, useRef, useEffect } from "react";
import base45 from "base45";
import pako from "pako";
import { decode } from "cborg";
import dccSchema from "./dcc-schema.json";

const getPropertiesByRef = ref => 
  dccSchema["$defs"][ref.split("/")[2]].properties;

const toJson = data => {
  const result = {};
  data.forEach((value, key) => {   
    if (value instanceof Array) {
      result[key] = value.map(toJson);
    } else if (value instanceof Map) {
      result[key] = toJson(value);
    } else {
      result[key] = value;
    }
  });
  return result;
}
const makeHumanReadable = (data, schema) => {
  const result = {};
  data.forEach((value, key) => {   
    const keySchema = schema[key];
    if (!keySchema) {
      result[key] = value;
      return;
    }
    const title = keySchema.title ?? keySchema.description;
    if (value instanceof Array) {
      const properties = getPropertiesByRef(keySchema.items["$ref"]);
      result[title] = value.map(e => makeHumanReadable(e, properties))
    } else if (value instanceof Map) {
      result[title] = makeHumanReadable(value, getPropertiesByRef(keySchema["$ref"]));
    } else {
      result[title] = value;
    } 
  });
  return result;
}

const useChangeDetection = (data, duration) => {
  const lastData = useRef(null);
  const [hasChanged, setHasChanged] = useState(false);
  const asJson = JSON.stringify(data);

  useEffect(() => {
    if (asJson !== lastData.current) {
      lastData.current = asJson;
      setHasChanged(true);
      const id = setTimeout(() => setHasChanged(false), duration);
      return () => clearTimeout(id);
    }
    return () => {}
  }, [asJson, duration])
  
  return hasChanged;
}

const parseData = (data) => {
  
  if (!data) {
    return null;
  }
  try {
    const stringData = data.slice(4);
    const base45decodedData = base45.decode(stringData);
    const uncompressedData = pako.inflate(base45decodedData);
    
    const tags = { 18: data => data };

    /* eslint-disable no-unused-vars */
    const [ headers1, headers2, payload, ignoreSignature ] = decode(uncompressedData, { tags });
    /* eslint-enable no-unused-vars */

    // todo: verify signature
    const decodedPayload = decode(payload, {useMaps: true});
    const schemaData = decodedPayload.get(-260).get(1);
    return {
      code: {
        issuer: decodedPayload.get(1),
        expiry: new Date(decodedPayload.get(4) * 1000),
        generated: new Date(decodedPayload.get(6) * 1000),
      },
      humanReadable: makeHumanReadable(schemaData, dccSchema.properties),
      data: toJson(schemaData),
    }
  } catch (e) {
    console.error(e);
    return new Error(e);
  }
}

export const Result = ({
  data
}) => {
  const parsedData = useMemo(() => parseData(data), [data]);
  const hasChanged = useChangeDetection(parsedData?.data, 1000);
  if (!parsedData) {
    return null;
  }
  
  return <div className={`result ${hasChanged ? "result--has-changed" : ""}`}>
    {(parsedData instanceof Error) 
      ? <ResultError error={parsedData} />
      : <ResultData {...parsedData} />
    }
  </div>
}

const ResultData = ({ data, humanReadable, code }) => {
  const [showDetails, setShowDetails] = useState(false);
  const currentDose = data.v?.[0]?.dn;
  const totalDoses = data.v?.[0]?.sd;
  const administeredTimestamp = new Date(data.v?.[0]?.dt);
  const daysAgo = Math.floor((Date.now() - administeredTimestamp) / 1000 / 60 / 60 / 24);
  const isValid = Date.now() < code.expiry;
  const isFullyProtected = currentDose === totalDoses && daysAgo > 14;
  return <>
    <button className="show-details" onClick={() => setShowDetails(!showDetails)}>{showDetails ? "Less details" : "More details"}</button>
    {!showDetails && <dl>
      <dt>Name</dt>
      <dd>{data.nam?.gn} {data.nam?.fn}</dd>

      <dt>DoB</dt>
      <dd>{data.dob}</dd>

      <dt>Vaccine</dt>
      <dd className={isFullyProtected ? "key--ok": "key--bad"}>{currentDose} / {totalDoses} ({daysAgo} days ago)</dd>

      <dt>Country</dt>
      <dd>{code.issuer}</dd>

      <dt>Code expiration</dt>
      <dd className={isValid ? "key--ok": "key--bad"}>{code.expiry.toISOString().slice(0, 10)}</dd>
    </dl>}
    {showDetails && <pre className="details">
      {JSON.stringify(humanReadable, null, 2)}
    </pre>}
  </>
}

const ResultError = () => {
  return <div className="error">Invalid code</div>
}