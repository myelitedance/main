"use client";

import { useState } from "react";
import StepStudentSearch from "./steps/StepStudentSearch";
import StepStudentSelect from "./steps/StepStudentSelect";
import StepClassSelect from "./steps/StepClassSelect";
import StepAgreement from "./steps/StepAgreement";
import StepSignature from "./steps/StepSignature";
import StepReview from "./steps/StepReview";
import { AkadaStudent, RecitalClassSelection } from "@/types/akada";


export default function RecitalWizard() {

  const [step, setStep] = useState(1);

const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");

  const [students, setStudents] = useState<AkadaStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AkadaStudent | null>(null);

  const [classList, setClassList] = useState<RecitalClassSelection[]>([]);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [isAdditionalDancer, setIsAdditionalDancer] = useState(false);

  const [signature, setSignature] = useState("");

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  return (
    <>
      {step === 1 && (
  <StepStudentSearch
    firstName={firstName}
    lastName={lastName}
    setFirstName={setFirstName}
    setLastName={setLastName}
    setStudents={setStudents}
    onNext={next}
  />
)}


      {step === 2 && (
        <StepStudentSelect
          students={students}
          selectedStudent={selectedStudent}
          setSelectedStudent={setSelectedStudent}
          onNext={next}
          onBack={back}
        />
      )}

      {step === 3 && (
        <StepClassSelect
          student={selectedStudent!}
          classList={classList}
          setClassList={setClassList}
          onNext={next}
          onBack={back}
        />
      )}

      {step === 4 && (
        <StepAgreement
          accepted={agreementAccepted}
          setAccepted={setAgreementAccepted}
          onNext={next}
          onBack={back}
        />
      )}

      {step === 5 && (
        <StepSignature
          signature={signature}
          isAdditionalDancer={isAdditionalDancer}
          setIsAdditionalDancer={setIsAdditionalDancer} 
          setSignature={setSignature}
          onNext={next}
          onBack={back}
        />
      )}

      {step === 6 && (
        <StepReview
          student={selectedStudent!}
          classList={classList}
          accepted={agreementAccepted}
          signature={signature}
          isAdditionalDancer={isAdditionalDancer}
          onBack={back}
        />
      )}
    </>
  );
}
