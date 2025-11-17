"use client";

import { useState } from "react";
import StepEmail from "./steps/StepEmail";
import StepStudentSelect from "./steps/StepStudentSelect";
import StepClassSelect from "./steps/StepClassSelect";
import StepAgreement from "./steps/StepAgreement";
import StepSignature from "./steps/StepSignature";
import StepReview from "./steps/StepReview";
import { AkadaStudent, RecitalClassSelection } from "@/types/akada";


export default function RecitalWizard() {

  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [students, setStudents] = useState<AkadaStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<AkadaStudent | null>(null);

  const [classList, setClassList] = useState<RecitalClassSelection[]>([]);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [signature, setSignature] = useState("");

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  return (
    <>
      {step === 1 && (
        <StepEmail
          email={email}
          setEmail={setEmail}
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
          setSignature={setSignature}
          onNext={next}
          onBack={back}
        />
      )}

      {step === 6 && (
        <StepReview
          email={email}
          student={selectedStudent!}
          classList={classList}
          accepted={agreementAccepted}
          signature={signature}
          onBack={back}
        />
      )}
    </>
  );
}
