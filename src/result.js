import { useMemo, useState, useRef, useEffect } from "react";
import base45 from "base45";
import pako from "pako";
import { decode } from "cborg";
import dccSchema from "./dcc-schema.json";

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusCircle, faMinusCircle } from '@fortawesome/free-solid-svg-icons';


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

// source: https://ec.europa.eu/health/sites/default/files/ehealth/docs/digital-green-value-sets_en.pdf
const VALUE_LOOKUP = {
  // Diseas
  "840539006": "COVID-19",

  // Tests
  "LP6464-4": "Nucleic acid amplification with probe detection",
  "LP217198-3": "Rapid immunoassay",

  // Vaccine/prophylaxis
  "1119305005": "SARS-CoV-2 antigen vaccine",
  "1119349007": "SARS-CoV-2 mRNA vaccine",
  "J07BX03": "covid-19 vaccines",

  // Vaccine medicinal product
  "EU/1/20/1528": "Comirnaty",
  "EU/1/20/1507": "Spikevax (previously COVID-19 Vaccine Moderna)",
  "EU/1/21/1529": "Vaxzevria",
  "EU/1/20/1525": "COVID-19 Vaccine Janssen",

  // Vaccine manufacturer
  "ORG-100001699": "AstraZeneca AB",
  "ORG-100030215": "Biontech Manufacturing GmbH",
  "ORG-100001417": "Janssen-Cilag International",
  "ORG-100031184": "Moderna Biotech Spain S.L.",
  "ORG-100006270": "Curevac AG",
  "ORG-100013793": "CanSino Biologics",
  "ORG-100020693": "China Sinopharm International Corp. - Beijing location",
  "ORG-100010771": "Sinopharm Weiqida Europe Pharmaceutical s.r.o. - Prague location",
  "ORG-100024420": "Sinopharm Zhijun (Shenzhen) Pharmaceutical Co. Ltd. -Shenzhen location",
  "ORG-100032020": "Novavax CZ AS",
  "ORG-100001981": "Serum Institute Of India Private Limited"
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
      result[title] = VALUE_LOOKUP[value] ?? value;
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
    const [ headers1, headers2, payload, ignoreSignature ] = decode(uncompressedData, { tags, useMaps: true });
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
  const isValid = Date.now() < code.expiry;
  console.log(data);
  
  return <>
    <button className="show-details" onClick={() => setShowDetails(!showDetails)}>
      {showDetails 
        ? <FontAwesomeIcon icon={faMinusCircle} title="Less details"/>
        : <FontAwesomeIcon icon={faPlusCircle} title="More details"/>
      }
    </button>
    {!showDetails && <dl>
      <dt>Name</dt>
      <dd>{data.nam?.gn} {data.nam?.fn}</dd>

      <dt>DoB</dt>
      <dd>{data.dob}</dd>

      <ResultVaccineData vaccine={data.v?.[0]} />
      <ResultRecoveryData recovery={data.r?.[0]} />
      <ResultTestData test={data.t?.[0]} />

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

const ResultVaccineData = ({vaccine}) => {
  if (!vaccine) {
    return null;
  }
  const currentDose = vaccine.dn;
  const totalDoses = vaccine.sd;
  const administeredTimestamp = new Date(vaccine.dt);
  const daysAgo = Math.floor((Date.now() - administeredTimestamp) / 1000 / 60 / 60 / 24);
  const isFullyProtected = currentDose === totalDoses && daysAgo > 14;
  const manufacturer = VALUE_LOOKUP[vaccine.ma] ?? vaccine.ma;
  const product = VALUE_LOOKUP[vaccine.mp] ?? vaccine.mp;

  return <>
    <dt>Vaccine</dt>
    <dd>{manufacturer} / {product}</dd>

    <dt>Dose and time</dt>
    <dd className={isFullyProtected ? "key--ok": "key--bad"}>
      {currentDose} / {totalDoses} ({daysAgo} days ago)
    </dd>
  </>
}

const ResultRecoveryData = ({recovery}) => {
  if (!recovery) {
    return null;
  }
  const valid = new Date(recovery.df) < Date.now() && new Date(recovery.du) > Date.now()

  return <>
    <dt>Recovery</dt>
    <dd className={valid ? "key--ok": "key--bad"}>
      Certified from {recovery.df} to {recovery.du}
    </dd>
  </>
}

const ResultTestData = ({test}) => {
  if (!test) {
    return null;
  }

  const testTime = new Date(test.sc);
  const testPositive = test.tr !== "260415000";
  const hoursAgo = Math.floor((Date.now() - testTime) / 1000 / 60 / 60);
  const valid = hoursAgo < 72 || !testPositive;

  return <>
    <dt>Test</dt>
    <dd className={valid ? "key--ok": "key--bad"}>
      {testTime.toISOString().slice(0, 10)} {testTime.toISOString().slice(11, 16)} UTC ({hoursAgo} hours ago) 
      - {testPositive ? "POSITIVE" : "negative"}
    </dd>
  </>
}

const ResultError = () => {
  return <div className="error">Invalid code</div>
}