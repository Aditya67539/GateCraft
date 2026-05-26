#include <stdlib.h>
#include <stdint.h>

uint16_t gateCount;
uint16_t wireCount;

uint8_t  *gateTypes;
uint16_t *outputOffset;
uint8_t  *allOutputs;
uint16_t *wireFrom;
uint16_t *wireTo;
uint8_t  *wireSignal;

uint16_t *currentDelta;
uint16_t *nextDelta;
uint16_t *inDelta;

uint8_t  *faninCounts;
uint16_t *faninOffsets;
uint16_t *faninWires;

uint8_t  *fanoutCounts;
uint16_t *fanoutOffsets;
uint16_t *fanoutWires;

void init(
    uint8_t *gt, uint16_t *oo, uint8_t *ao,
    uint16_t *wf, uint16_t *wt, uint8_t *ws,
    uint16_t *cd, uint16_t *nd, uint16_t *id,
    uint16_t gc, uint16_t wc,
    uint8_t *fic, uint16_t *fio, uint16_t *fiw,
    uint8_t *foc, uint16_t *foo, uint16_t *fow
) {
    gateCount    = gc;
    wireCount    = wc;
    gateTypes    = gt;
    outputOffset = oo;
    allOutputs   = ao;
    wireFrom     = wf;
    wireTo       = wt;
    wireSignal   = ws;
    currentDelta = cd;
    nextDelta    = nd;
    inDelta      = id;
    faninCounts  = fic;
    faninOffsets = fio;
    faninWires   = fiw;
    fanoutCounts = foc;
    fanoutOffsets= foo;
    fanoutWires  = fow;
}


uint8_t evaluateGate(uint8_t type, uint8_t *inputs, uint8_t inputCount) {
    uint8_t output;

    switch (type)
    {
    // Output gate
    case 2:
        output = inputs[0];
        break;
    // AND gate
    case 3:
        output = 1;
        for (int i = 0; i < inputCount; i++) {
            output = output & inputs[i];
        }
        break;
    // OR gate
    case 4:
        output = 0;
        for (int i = 0; i < inputCount; i++) {
            output = output | inputs[i];
        }
        break;
    // NOT gate
    case 5:
        output = inputs[0] == 0 ? 1 : 0;
        break;
    // NAND gate
    case 6:
        output = 1;
        for (int i = 0; i < inputCount; i++) {
            output = output & inputs[i];
        }
        output = output == 0 ? 1 : 0;
        break;
    // NOR gate
    case 7:
        output = 0;
        for (int i = 0; i < inputCount; i++) {
            output = output | inputs[i];
        }
        output = output == 0 ? 1 : 0;
        break;
    // XOR gate
    case 8:
        output = 0;
        for (int i = 0; i < inputCount; i++) {
            output = output ^ inputs[i];
        }
        break;
    // XNOR gate
    case 9:
        output = 0;
        for (int i = 0; i < inputCount; i++) {
            output = output ^ inputs[i];
        }
        output = output == 0 ? 1 : 0;
        break;
    default:
        break;
    }
    return output;
}


int evaluateFlat() {
    int currentCount = 0;
    int nextCount = 0;

    // JS needs to update the allOutputs array with output of gate instances

    for (int i = 0; i < wireCount; i++) {
        const uint8_t gateType = gateTypes[wireFrom[i]];
        if (gateType == 0 || gateType == 1) {
            if (allOutputs[outputOffset[wireFrom[i]]] != wireSignal[i]) {
                wireSignal[i] = allOutputs[outputOffset[wireFrom[i]]];
                currentDelta[currentCount++] = wireTo[i];
            }
        }
    }

    if (currentCount == 0) return 0; // No changes detected — early exit

    int iterations = 0;

    while (currentCount > 0 && iterations < 100) {
        const uint16_t gateIndex = currentDelta[--currentCount];

        if (gateTypes[gateIndex] == 0 || gateTypes[gateIndex] == 1) {
            uint8_t newVal = allOutputs[outputOffset[gateIndex]];
            
            // O(1) Fanin lookup
            uint8_t inCount = faninCounts[gateIndex];
            if (inCount > 0) {
                uint16_t offset = faninOffsets[gateIndex];
                newVal = wireSignal[faninWires[offset]]; // take first fanin wire
            }

            uint8_t oldVal = allOutputs[outputOffset[gateIndex]];
            allOutputs[outputOffset[gateIndex]] = newVal;

            if (newVal != oldVal) {
                // O(1) Fanout lookup
                uint8_t outCount = fanoutCounts[gateIndex];
                uint16_t offset = fanoutOffsets[gateIndex];
                for (int i = 0; i < outCount; i++) {
                    uint16_t w = fanoutWires[offset + i];
                    wireSignal[w] = newVal;
                    nextDelta[nextCount++] = wireTo[w];
                }
            }
        } else {
            uint8_t inputSignals[256]; // Note: Assumes max 256 inputs
            
            // O(1) Fanin lookup
            uint8_t count = faninCounts[gateIndex];
            uint16_t inOffset = faninOffsets[gateIndex];
            for (int i = 0; i < count; i++) {
                inputSignals[i] = wireSignal[faninWires[inOffset + i]];
            }

            const uint8_t oldOutput = allOutputs[outputOffset[gateIndex]];
            const uint8_t newOutput = evaluateGate(gateTypes[gateIndex], inputSignals, count);

            allOutputs[outputOffset[gateIndex]] = newOutput;

            if (newOutput != oldOutput) {
                // O(1) Fanout lookup
                uint8_t outCount = fanoutCounts[gateIndex];
                uint16_t outOffset = fanoutOffsets[gateIndex];
                for (int i = 0; i < outCount; i++) {
                    uint16_t w = fanoutWires[outOffset + i];
                    wireSignal[w] = newOutput;
                    nextDelta[nextCount++] = wireTo[w];
                }
            }
        }

        if (currentCount == 0) {
            uint16_t *temp = currentDelta;
            currentDelta = nextDelta;
            nextDelta = temp;
            currentCount = nextCount;
            nextCount = 0;
            iterations++;
        }
    }
    // JS handles readback to the gate instances
    return 1;
}