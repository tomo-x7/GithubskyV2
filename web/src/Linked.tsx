import { InfoOutlined } from "@mui/icons-material";
import {
	Avatar,
	Button,
	Dialog,
	DialogActions,
	DialogTitle,
	ListItem,
	ListItemAvatar,
	ListItemText,
	Typography,
} from "@mui/material";
import { useState } from "react";
import { createCallable } from "react-call";
import type { githubNameData, githubOAuthData } from "./App";
import { notify } from "./Notify";
import type { client } from "./main";
import { DepInfo, NoAuthError } from "./util";

type props<T = githubNameData | githubOAuthData> = { data: T; onSessionTimeout: () => void; client: client };
const isOAuth = (p: props): p is props<githubOAuthData> => p.data.github === "oauth";
export function Linked(props: props<githubNameData> | props<githubOAuthData>) {
	return (
		<>
			{isOAuth(props) ? <GithubOAuth {...props} /> : <GithubName {...props} />}
			<Exit {...props} />
			<ConfirmExit.Root />
		</>
	);
}

function GithubName({
	data,
	client,
	onSessionTimeout,
}: { data: githubNameData; client: client; onSessionTimeout: () => void }) {
	const [OAuthSending, setOAuthSending] = useState(false);
	const handleOAuthLink = async () => {
		setOAuthSending(true);
		try {
			const url = await client.github_login.$post().then<string | number>((r) => (r.ok ? r.text() : r.status));
			if (typeof url === "number") throw url === 401 ? new NoAuthError() : new Error();

			location.href = url;
		} catch (e) {
			setOAuthSending(false);
			if (e instanceof NoAuthError) {
				notify("セッションが切れました");
				return onSessionTimeout();
			}
			notify("エラーが発生しました");
		}
	};

	return (
		<>
			<Typography sx={{ mb: 1 }}>
				名前で連携中です(ユーザー名:
				<Typography component="span" sx={{ fontWeight: 700 }}>
					{data.github_name}
				</Typography>
				)
				<br />
				名前での連携は非推奨です
				<Button onClick={() => DepInfo.call()} variant="text">
					<InfoOutlined sx={{ fontSize: 15 }} />
					理由
				</Button>
			</Typography>
			<Button onClick={handleOAuthLink} variant="contained" loading={OAuthSending}>
				OAuth連携に変更
			</Button>
		</>
	);
}

function GithubOAuth({ data }: { data: githubOAuthData }) {
	return (
		<>
			<Typography sx={{ mb: 1 }}>OAuthで連携済みです</Typography>
			<ListItem disablePadding>
				<ListItemAvatar>
					<Avatar src={data.avatar_url} alt={data.github_name} />
				</ListItemAvatar>
				<ListItemText primary={data.github_name} />
			</ListItem>
		</>
	);
}

function Exit({ onSessionTimeout, client }: { onSessionTimeout: () => void; client: client }) {
	const [sending, setSending] = useState(false);
	const handleExit = async () => {
		const confirm = await ConfirmExit.call();
		if (!confirm) return;
		setSending(true);
		try {
			const res = await client.exit.$delete().then(async (res) => {
				const data = await res.json();
				if (!data.success) {
					if (res.status === 401) throw new NoAuthError();
					return data.error;
				}
			});
			if (res != null) {
				notify(res);
			} else {
				location.href = "/";
			}
		} catch (e) {
			setSending(false);
			if (e instanceof NoAuthError) {
				notify("セッションが切れました");
				return onSessionTimeout();
			}
			notify("エラーが発生しました");
		}
	};
	return (
		<Button onClick={handleExit} variant="outlined" color="error" sx={{ mt: 5 }} loading={sending}>
			退会する
		</Button>
	);
}

const ConfirmExit = createCallable<void, boolean>(({ call }) => (
	<>
		<Dialog
			aria-describedby="alert-dialog-description"
			aria-labelledby="alert-dialog-title"
			onClose={() => call.end(false)}
			open={!call.ended}
		>
			<DialogTitle id="alert-dialog-title">本当に退会しますか？</DialogTitle>
			<DialogActions sx={{ gap: 1 }}>
				<Button autoFocus onClick={() => call.end(false)} variant="contained">
					いいえ
				</Button>
				<Button onClick={() => call.end(true)} variant="outlined" color="error">
					退会
				</Button>
			</DialogActions>
		</Dialog>
	</>
));
