import { BskyAgent, RichText } from "@atproto/api";
import { fail, success, writelog } from "./supabase";

export const post = async (
	bsky_password: string,
	github_name: string,
	commitcount: number | string,
	id: number,
	fail_count: number,
	DID: string,
	imgblob: Blob | undefined,
	PDS: string | undefined,
) => {
	try {
		const agent = new BskyAgent({
			service: PDS ?? "https://bsky.social",
		});

		await agent.login({
			identifier: DID,
			password: bsky_password,
		});

		const message = new RichText({
			text: `昨日はGitHubに${commitcount}回commitしました\n#Githubsky\nhttps://github.com/${github_name}`,
		});
		message.detectFacets(agent);

		if (imgblob) {
			//画像の取得に成功した場合、画像付きでポスト
			const dataArray: Uint8Array = new Uint8Array(await imgblob.arrayBuffer());
			const { data } = await agent.uploadBlob(dataArray, {
				// 画像の形式を指定 ('image/jpeg' 等の MIME タイプ)
				encoding: imgblob.type,
			});
			await agent.post({
				text: message.text,
				facets: message.facets,
				langs: ["ja"],
				createdAt: new Date().toISOString(),
				embed: {
					$type: "app.bsky.embed.external",
					external: {
						uri: "https://githubsky.vercel.app/",
						thumb: {
							$type: "blob",
							ref: {
								$link: data.blob.ref.toString(),
							},
							mimeType: data.blob.mimeType,
							size: data.blob.size,
						},
						title: "Githubsky",
						description: "",
					},
				},
			});
		} else {
			writelog(`${DID}の画像取得エラー`);
		}
		success(id);
	} catch (e) {
		await writelog(`${DID}の投稿時エラー\n${e}`);
		fail(id, fail_count);
	}
};
