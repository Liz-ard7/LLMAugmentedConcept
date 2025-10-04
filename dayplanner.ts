/**
 * DayPlanner Concept - AI Augmented Version
 */

import { GeminiLLM } from './gemini-llm';
import * as fs from 'fs';
import { availableParallelism } from 'os';
import * as path from 'path';

// A single fanfiction that can have tags generated for it
export interface Fic {
    title: string;
    text: string; // the body of the fanfic
    authorTags: string[];
}

// export enum TagType {Fandom, Character, Relationship, Additional, Rating, Warning, Category}

export interface Tag {
    name: string;
    type: string; // the type of tag (i.e. fandom, character, relationship, etc...)
    reason: string;
}

// An assignment of a Fic to a set of suggested tags and a set of tags to remove
 export interface FicCategory {
    fanfiction: Fic;
    suggestedTags: Array<Tag>; // Maps a tag type (fandom, char) --> [name, reasonToAdd]
    tagsToRemove: Array<Tag>; // Maps a tag type --> [name, reasonToRemove]
}

export class Categorization {
    private ficCategories: Array<FicCategory> = [];
    // ...admittedly, not very safe from rep exposure since we would be passing fic to and fro

    // private fic: Fic = {title: "", text: "", authorTags: []};
    // private ficCategory = {fanfiction: this.fic, suggestedTags: [], tagsToRemove: []};

    /**
     * Tries to find the ficCategory for a fic. If not possible, returns undefined.
     * @param fic the fic to find within the set of ficCategories
     * @returns the ficCategory associated with the fic, or undefined if it doesn't exist
     */
    viewFicCategory(fic: Fic): FicCategory | undefined {
        let ficCat: FicCategory | undefined = undefined;
        for(const fanficCat of this.ficCategories) {
            if(fic === fanficCat.fanfiction) { // Must match actual object since we are interacting with Library, not just a user
                ficCat = fanficCat;
            }
        }
        // if(ficCat === undefined) {
        //     throw new Error("Fic not present within Categorization!");
        // }

        return ficCat;
    }

    deleteFicCategory(fic: Fic): FicCategory { // Essentially pops the ficCategory
        const ficCat = this.viewFicCategory(fic);

        if(ficCat === undefined) {
            throw new Error("fic not present within this Categorization");
        }

        // Remove fic from the set of ficCategories
        this.ficCategories = this.ficCategories.filter(searchingFicCat => searchingFicCat.fanfiction !== fic);

        return ficCat;
    }

    deleteFicCategories(ficCats: FicCategory[]): void { // Removes a subsection of ficCategories from the set
        for(const ficCat of ficCats) {
            this.deleteFicCategory(ficCat.fanfiction);
        }
    }


    async keywordGeneratorTagCleaner(llm: GeminiLLM, fic: Fic): Promise<void> {
        try {
            console.log('🤖 Requesting tag suggestions from Gemini AI...');

            if(this.viewFicCategory(fic) !== undefined) {
                this.deleteFicCategory(fic); //Resubmitting fic, so delete the old stuff
            }

            const prompt = this.createFanfictionPrompt(fic);
            const text = await llm.executeLLM(prompt);

            console.log('✅ Received response from Gemini AI!');
            console.log('\n🤖 RAW GEMINI RESPONSE');
            console.log('======================');
            console.log(text);
            console.log('======================\n');

            // Parse and apply the assignments
            this.parseAndApplyTags(text, fic);

        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }
    }

    /**
     * Helper functions and queries follow
     */

    // private isAssigned(activity: Activity): boolean {
    //  return this.assignments.some(
    //     (assignment) => assignment.activity === activity);
    // }

    /**
     * Create the prompt for Gemini with hardwired preferences
     */
    private createFanfictionPrompt(fic: Fic): string {
        const csvFilePath = 'tagsEdited2021.csv';

        let csvString = 'Meow';
        try {
            csvString = readCsvFileAsString(csvFilePath);
        } catch (error) {
            throw new Error("I can't parse tagsEdited2021");
        }

        return `
You are a helpful AI assistant that returns a list of fanfiction tags for people to tag their fanfictions with, and helps to refine their already-existing tag ideas.

Analyze the fanfiction content and compare it to the user's proposed tags. Based on that:
1. Suggest new tags to add from the official list if they are clearly supported by the story.
2. Suggest tags to remove if the user proposed them but they are not clearly supported by the story.
3. Explain your decisions for each added or removed tag in a reasons section.

CRITICAL RULES:
1. Only suggest to add tags that are present in the official list.
2. Tags must be grounded in the content. Do not guess or infer beyond what is present. Do not rely on the author's proposed tags as evidence.
3. If a section (like tagsToRemove) has no entries, return it as an empty object ({}).
4. Output only the JSON object — no extra commentary, explanations, or markdown.
5. NO DUPLICATION: Do not suggest adding a tag if it is already included in the author's proposed tag list.
6. Do NOT suggest to remove a tag just because it is not standard, recognized, or within the list of recognized tags.
7. DO NOT suggest to remove tags because they are too specific.

For context, / is romantic relationships (and categories) and & is platonic relationships. M/M, F/M, F/F are for romance categories and Gen is for platonic categories.
Users often filter by relationships, so just because 2 characters are proposed tags does not mean that the relationship tag itself should be removed.

OFFICIAL TAGS IN THE FORMAT OF TYPE, NAME, NUMBER OF USES (ONLY THESE - DO NOT ADD OTHERS):
${csvString}

For the list of tags generated for the fanfiction each with a type as specified from the list of offical tags, return your response as a JSON object with this exact structure:
{
  "content": {
    "tagsToAdd": [
      {
        "name": "TagName",
        "type": "TagType",
        "reason": "Reason this tag was added."
      }
    ],
    "tagsToRemove": [
      {
        "name": "TagName",
        "type": "TagType",
        "reason": "Reason this tag was removed."
      }
    ]
  }
}

Return ONLY the JSON object, no additional text.

Here is the user's title:
${fic.title}

Here is the user's fanfiction text:
${fic.text}

Finally, here is the user's proposed tags:
${fic.authorTags}`;
    }

    /**
     * Parse the LLM response and apply the generated assignments
     */
    private parseAndApplyTags(responseText: string, fic: Fic): void {
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const response = JSON.parse(jsonMatch[0]);

            if (!response.content || !Array.isArray(response.content.tagsToAdd) || !Array.isArray(response.content.tagsToRemove)) {
                throw new Error('Invalid response format');
            }

            console.log('📝 Applying LLM assignments...');
            const newFicCat: FicCategory = {fanfiction: fic, suggestedTags: [], tagsToRemove: []};

            const issues: string[] = [];

            for(const suggestedTag of response.content.tagsToAdd) {
                const newTag: Tag = {name: suggestedTag.name, type: suggestedTag.type, reason: suggestedTag.reason};

                if(fic.authorTags.includes(suggestedTag.name)) {
                    continue
                    issues.push(`Duplicated Tag between ${suggestedTag.name} and author tags`);
                }

                if(newTag.reason === "") {
                    issues.push(`Tag name ${newTag.name} and ${newTag.reason} has no reason as to why it is being suggested!`);
                }

                if(newTag.name === "") {
                    issues.push(`Tag ${newTag.type} and ${newTag.reason} has no name!`);
                }

                if(newTag.type === "") {
                    issues.push(`Tag ${newTag.name} and ${newTag.reason} has no type!`);
                }

                newFicCat.suggestedTags.push(newTag);
            }

            for(const hatedTag of response.content.tagsToRemove) {
                const newTag: Tag = {name: hatedTag.name, type: hatedTag.type, reason: hatedTag.reason};

                if(!fic.authorTags.includes(hatedTag.name)) {
                    continue
                    issues.push(`Tried to remove tag ${hatedTag.name} that author didn't suggest`);
                }

                if(newTag.reason === "") {
                    issues.push(`Tag name ${newTag.name} has no reason as to why it is being suggested to remove!`);
                }

                if(newTag.name === "") {
                    issues.push(`Tag ${newTag.type} and ${newTag.reason} has no name!`);
                }

                if(newTag.type === "") {
                    issues.push(`Tag ${newTag.name} and ${newTag.reason} has no type!`);
                }

                newFicCat.tagsToRemove.push(newTag);
            }

            if (issues.length > 0) {
                throw new Error(`LLM provided disallowed assignments:\n- ${issues.join('\n- ')}`);
            }

            this.ficCategories.push(newFicCat);

            console.log('📝 Done with assigning tags!...');

        } catch (error) {
            console.error('❌ Error parsing LLM response:', (error as Error).message);
            console.log('Response was:', responseText);
            throw error;
        }
    }

    /**
     * Return assigned tags organized by tag type
     */
    private getOrganizedTags(fic: Fic): {suggestedTags: Map<string, Tag[]>, tagsToRemove: Map<string, Tag[]>} {
        const ficTags: {suggestedTags: Map<string, Tag[]>, tagsToRemove: Map<string, Tag[]>} = {suggestedTags: new Map(), tagsToRemove: new Map()};
        //Returns suggestedTags -> tagType -> tag

        const ficCat = this.viewFicCategory(fic);

        if(ficCat === undefined) {
            throw new Error("fic does not exist in Categorization");
        }

        for (const suggestedTag of ficCat.suggestedTags) {
            const tagType = suggestedTag.type;

            if(ficTags.suggestedTags.has(tagType)) {
                ficTags.suggestedTags.get(tagType)?.push(suggestedTag);
            } else {
                ficTags.suggestedTags.set(tagType, [suggestedTag]);
            }
        }

        for (const hatedTag of ficCat.tagsToRemove) {
            const tagType = hatedTag.type;

            if(ficTags.tagsToRemove.has(tagType)) {
                ficTags.tagsToRemove.get(tagType)?.push(hatedTag);
            } else {
                ficTags.tagsToRemove.set(tagType, [hatedTag]);
            }
        }

        return ficTags;
    }

    tagsToString(fic: Fic): string {
        const organizedTags = this.getOrganizedTags(fic);

        let stringTag = "Suggested tags: \n=======================\n";

        for(const tagMap of organizedTags.suggestedTags) {
            const tagType = tagMap[0];
            const tagSet = tagMap[1];

            stringTag += `\n${tagType}: \n-----------------------\n`;
            for(const tag of tagSet) {
                stringTag += `${tag.name}: ${tag.reason}\n`;
            }
        }

        stringTag += "\nTags to leave out: \n=======================\n";

        for(const tagMap of organizedTags.tagsToRemove) {
            const tagType = tagMap[0];
            const tagSet = tagMap[1];

            stringTag += `$\n${tagType}: \n-----------------------\n`;
            for(const tag of tagSet) {
                stringTag += `${tag.name}: ${tag.reason}\n`;
            }
        }

        return stringTag;
    }

}

function readCsvFileAsString(filePath: string): string {
    try {
        const fullPath = path.resolve(filePath);
        const fileContent = fs.readFileSync(fullPath, { encoding: 'utf-8' });
        return fileContent;
    } catch (error) {
        console.error(`Error reading CSV file: ${error}`);
        throw error;
    }
}
