"use strict";

function shiftOnePitchClass(pitchClasses) {
    const newPcs = [...pitchClasses];

    const candidates = [];
    for (let i = 0; i < newPcs.length; i++) {
        candidates.push({ index: i, direction: 1 }); // +1
        candidates.push({ index: i, direction: -1 }); // -1
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const r = Math.floor(Math.random() * (i + 1));
            [array[i], array[r]] = [array[r], array[i]];
        }
        return array;
    }

    shuffle(candidates);

    for (const { index, direction } of candidates) {
        const originalPitch = newPcs[index];

        const temp = newPcs.filter((_, i) => i !== index);

        const newPitch = (originalPitch + (direction === 1 ? 1 : 11)) % 12;

        if (!temp.includes(newPitch)) {
            newPcs[index] = newPitch;
            return {
                pitches: newPcs,
                changedIndex: index,
                // changedPitch: newPitch,
                direction: direction
            };
        }
    }
}

function generate(firstPitches, iteration, download = false) {

    // chord, notes, rootIndex, updown, updownIndex
    // CM7, [C, E, G, B], 0, 0, -1, 
    // Em6, [C#, E, G, B], 1, 1, 0,
    // Eb7(#5), [Db, Eb, G, B], 1, -1, 1

    const chords = [];
    const notes = [];
    const rootLocations = [];
    const updowns = [];
    const updownIndexes = [];

    const previousPitches = [];
    let pitches = firstPitches;
    previousPitches.push(firstPitches);

    chords.push(pitchClass2chord(firstPitches));
    notes.push(chord2noteNames(pitchClass2chord(firstPitches)));
    rootLocations.push(0);
    updowns.push(0);
    updownIndexes.push(-1);

    for (let i = 0; i < iteration; i++) {
        let newChord = null;
        let newChords = [];
        let updown = null;
        let updownIndex = null;

        let chordLoopCounter = 0;

        do {
            const shiftedResult = shiftOnePitchClass(pitches);
            let newPitches = shiftedResult.pitches;
            updown = shiftedResult.direction;
            updownIndex = shiftedResult.changedIndex;

            let loopCounter = 0;
            while (hasArrayIgnoringOrder(previousPitches, newPitches)) {
                const shiftedResult = shiftOnePitchClass(pitches);
                newPitches = shiftedResult.pitches;
                updown = shiftedResult.direction;
                updownIndex = shiftedResult.changedIndex;

                loopCounter++;
                if (loopCounter > 100) {
                    return;
                }
            }

            pitches = newPitches;
            previousPitches.push(pitches);

            const pitchesList = [];
            for (let j = 0; j < pitches.length; j++) {
                pitchesList.push(rotateArray(pitches, j));
            }
            newChords = pitchesList.map(pitches => pitchClass2chord(pitches)).filter(chord => chord !== null);

            newChord = bestChord(newChords);

            chordLoopCounter++;
            if (chordLoopCounter > 1000) {
                break;
            }
        } while (newChord.includes("omit"));


        // ここまで
        console.log(newChord);

        // pitches = pitchesList[newChords.indexOf(newChord)];
        // pitches = pitchesList[0];

        const rootIndex = newChords.indexOf(newChord);


        const newChordNotes = chord2noteNames(newChord);
        const newChordPitchClasses = newChordNotes.map(note => Tonal.Midi.toMidi(`${note}4`) % 12);

        let newSortedNotes = [];
        newChordPitchClasses.forEach((pitchClass, index) => {
            newSortedNotes[pitches.indexOf(pitchClass)] = newChordNotes[index]
        })

        chords.push(newChord);
        notes.push(newSortedNotes);
        rootLocations.push(rootIndex);
        updowns.push(updown);
        updownIndexes.push(updownIndex);
    }

    // Make the result to CSV
    const data = [
        [
            "milliseconds", "chord",
            "note1", "note-top1", "note-bottom1", "note-right1",
            "note2", "note-top2", "note-bottom2", "note-right2",
            "note3", "note-top3", "note-bottom3", "note-right3",
            "note4", "note-top4", "note-bottom4", "note-right4",
            "rootIndicator1", "rootIndicator2", "rootIndicator3", "rootIndicator4", "up1", "down1", "up2", "down2", "up3", "down3", "up4", "down4",
            "note-x-offset1", "note-y-offset1",
            "note-x-offset2", "note-y-offset2",
            "note-x-offset3", "note-y-offset3",
            "note-x-offset4", "note-y-offset4",
        ]
    ];

    const bpm = 128.8;
    const millisecPerMeasure = 60 / bpm * 1000 * 4;
    const millisecondsPerData = 30;

    let measures = 0;
    // for (let i = 0; i < chords.length * millisecPerMeasure; i += millisecondsPerData) {
    for (let i = 0; i < chords.length; i++) {
        // measures = Math.floor(i / millisecPerMeasure);
        // let notesInfo = [
        //     {
        //         main: "C",
        //         top: "C#",
        //         bottom: "B",
        //         right: "B#"
        //     },
        // ]

        const notesInfo = [];

        for (let j = 0; j < 4; j++) {
            if (notes[i + 1]) {
                if (notes[i][j] == notes[i + 1][j]) {
                    notesInfo.push({
                        main: notes[i][j],
                        top: "",
                        bottom: "",
                        right: "",
                        direction: "none"
                    })
                } else {
                    if (updownIndexes[i + 1] === j && updowns[i + 1] === 1) {
                        notesInfo.push({
                            main: notes[i][j],
                            top: notes[i + 1][j],
                            bottom: "",
                            right: "",
                            direction: "down"
                        });
                    } else if (updownIndexes[i + 1] === j && updowns[i + 1] === -1) {
                        notesInfo.push({
                            main: notes[i][j],
                            top: "",
                            bottom: notes[i + 1][j],
                            right: "",
                            direction: "up"
                        });
                    } else {
                        notesInfo.push({
                            main: notes[i][j],
                            top: "",
                            bottom: "",
                            right: notes[i + 1][j],
                            direction: "left"
                        });
                    }
                }
            } else {
                notesInfo.push({
                    main: notes[i][j],
                    top: "",
                    bottom: "",
                    right: "",
                    direction: "none"
                })
            }
        }

        console.log(notesInfo);

        const measureBaseData = [
            chords[i],

            notesInfo[0].main,
            notesInfo[0].top,
            notesInfo[0].bottom,
            notesInfo[0].right,

            notesInfo[1].main,
            notesInfo[1].top,
            notesInfo[1].bottom,
            notesInfo[1].right,

            notesInfo[2].main,
            notesInfo[2].top,
            notesInfo[2].bottom,
            notesInfo[2].right,

            notesInfo[3].main,
            notesInfo[3].top,
            notesInfo[3].bottom,
            notesInfo[3].right,

            rootLocations[i] === 0 ? "1" : "0",
            rootLocations[i] === 1 ? "1" : "0",
            rootLocations[i] === 2 ? "1" : "0",
            rootLocations[i] === 3 ? "1" : "0",

            updownIndexes[i] === 0 && updowns[i] === 1 ? "1" : "0",
            updownIndexes[i] === 0 && updowns[i] === -1 ? "1" : "0",
            updownIndexes[i] === 1 && updowns[i] === 1 ? "1" : "0",
            updownIndexes[i] === 1 && updowns[i] === -1 ? "1" : "0",
            updownIndexes[i] === 2 && updowns[i] === 1 ? "1" : "0",
            updownIndexes[i] === 2 && updowns[i] === -1 ? "1" : "0",
            updownIndexes[i] === 3 && updowns[i] === 1 ? "1" : "0",
            updownIndexes[i] === 3 && updowns[i] === -1 ? "1" : "0"
        ];

        const startTime = Math.round(i * millisecPerMeasure);
        const nextStartTime = Math.round((i + 1) * millisecPerMeasure);

        const keyframes = [
            {
                time: startTime,
                offset: 0
            },
            {
                time: nextStartTime - 100,
                offset: 0
            },
            {
                time: nextStartTime - 80,
                offset: 1 - (1 / 2)
            },
            {
                time: nextStartTime - 60,
                offset: 1 - (1 / 4)
            },
            {
                time: nextStartTime - 40,
                offset: 1 - (1 / 8)
            },
            {
                time: nextStartTime - 20,
                offset: 1 - (1 / 16)
            },
            {
                time: nextStartTime - 2,
                offset: 1 - (1 / 32)
            },
            {
                time: nextStartTime - 1,
                offset: 1
            },
        ]

        keyframes.forEach(keyframe => {
            const offsetData = [];

            for (let j = 0; j < 4; j++) {
                switch (notesInfo[j].direction) {
                    case "up":
                        offsetData.push(0, -1 * keyframe.offset);
                        break;
                    case "down":
                        offsetData.push(0, keyframe.offset);
                        break;
                    case "left":
                        offsetData.push(-1 * keyframe.offset, 0);
                        break;
                    case "none":
                        offsetData.push(0, 0);
                        break;
                }
            }

            data.push([keyframe.time, ...measureBaseData, ...offsetData]);
        })
    }

    console.log(data);


    if (download) {
        // let csvContent = data.map(row => row.join(",")).join("\n");
        // let csvContent = data.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
        let csvContent = data.map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
        ).join("\n");


        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "data.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

function rotateArray(arr, n) {
    const len = arr.length;
    n = n % len;
    if (n < 0) {
        n += len;
    }
    return arr.slice(n).concat(arr.slice(0, n));
}

function bestChord(chords) {
    let nonOmitChords = chords.filter(chord => !chord.includes("omit"));
    let omitChords = chords.filter(chord => chord.includes("omit"));

    if (nonOmitChords.length > 0) {
        return nonOmitChords.reduce((shortest, current) =>
            current.length < shortest.length ? current : shortest
        );
    }

    if (omitChords.length > 0) {
        return omitChords.reduce((shortest, current) =>
            current.length < shortest.length ? current : shortest
        );
    }

    return null;
}

function hasArrayIgnoringOrder(collection, target) {
    const sortedTarget = [...target].sort((a, b) => a - b);
    return collection.some(arr => {
        if (arr.length !== target.length) return false;
        const sortedArr = [...arr].sort((a, b) => a - b);
        return sortedArr.every((v, i) => v === sortedTarget[i]);
    });
}
