import type { TranscriptionProviderPort } from '../ports/transcription.port.ts';
import type { StructuredExtractionPort } from '../ports/structured-extraction.port.ts';
import { VoiceNoteProposalSchema } from '../domain/ai-types.ts';
import type { VoiceNoteProposal } from '../domain/ai-types.ts';
import { Result } from '../../../shared/domain/result.ts';

export interface ProcessVoiceNoteInput {
  audioBuffer: Buffer;
  mimeType: string;
  workshopId: string;
  mechanicId: string;
  vehicleId: string;
}

export interface VoiceNoteProcessingOutput {
  proposal: VoiceNoteProposal;
  requiresMechanicReview: true;
  safetyNotice: string;
}

export class ProcessVoiceNoteUseCase {
  private readonly transcriptionProvider: TranscriptionProviderPort;
  private readonly structuredExtractor: StructuredExtractionPort;

  constructor(
    transcriptionProvider: TranscriptionProviderPort,
    structuredExtractor: StructuredExtractionPort
  ) {
    this.transcriptionProvider = transcriptionProvider;
    this.structuredExtractor = structuredExtractor;
  }

  public async execute(input: ProcessVoiceNoteInput): Promise<Result<VoiceNoteProcessingOutput, string>> {
    if (!input.audioBuffer || input.audioBuffer.length === 0) {
      return Result.fail('Audio buffer cannot be empty.');
    }

    // Step 1: Transcribe Voice Note
    let rawText: string;
    try {
      const transcriptionResult = await this.transcriptionProvider.transcribe(
        input.audioBuffer,
        input.mimeType,
        {
          language: 'es',
          promptContext: 'mantenimiento mecánico, aceite, filtro, frenos, bujías, odómetro, kilometraje, service',
        }
      );
      rawText = transcriptionResult.text;
    } catch (err: unknown) {
      return Result.fail(`Voice transcription failed: ${(err as Error).message}`);
    }

    // Step 2: Extract Structured Maintenance Proposal
    const extractionPrompt = `Extract structured maintenance intervention details from the following mechanic dictation:
Dictation: "${rawText}"

Extract:
- odometerKm (integer)
- workPerformed (list of standard action keys, e.g. "oil_change", "oil_filter_replacement")
- suggestedNextServiceKm (optional integer)
- diagnosisNotes (optional string)
- replacedParts (list of { description, quantity })
- confidence (float between 0 and 1)
- requiresConfirmation (must be true)
- rawTranscription: "${rawText}"`;

    try {
      const proposal = await this.structuredExtractor.extract(
        extractionPrompt,
        VoiceNoteProposalSchema,
        { workshopId: input.workshopId }
      );

      return Result.ok({
        proposal,
        requiresMechanicReview: true,
        safetyNotice: 'Human-in-the-loop: Mechanic must review and confirm proposal before persisting as a verified service record.',
      });
    } catch (err: unknown) {
      return Result.fail(`AI extraction failed to produce valid proposal: ${(err as Error).message}`);
    }
  }
}
